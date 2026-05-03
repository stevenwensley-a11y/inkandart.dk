# `/api/status` — kontrakt + drift

Walk-in-sidens hjerte. Returnerer shop-niveau åben/lukket-status + næste
ledige tid, edge-cached og fail-soft mod scheduled hours.

---

## Endpoint

```
GET https://inkandart.dk/api/status
```

Ingen auth. Public. Cached på edge.

---

## Response-skema

```json
{
  "open": true,
  "nextSlot": "14:30",
  "source": "booksys",
  "stale": false
}
```

| Felt | Type | Beskrivelse |
|---|---|---|
| `open` | `boolean` | Shop åben *nu* (binær). Aldrig per-artist. |
| `nextSlot` | `string \| null` | Næste ledige tid i dag, format `HH:MM`. `null` hvis ingen ledig slot inden lukketid. |
| `source` | `"booksys" \| "booksys-mock" \| "schedule" \| "schedule-fallback"` | Hvor data kom fra. Til debug. |
| `stale` | `boolean` | `true` hvis data er > 5 minutter gammel. UI tilføjer "(status nogle min. gammel)". |

### Eksempler

**Åben + ledig tid om 30 min:**
```json
{ "open": true, "nextSlot": "14:30", "source": "booksys", "stale": false }
```

**Åben men fuldt booked resten af dagen:**
```json
{ "open": true, "nextSlot": null, "source": "booksys", "stale": false }
```

**Lukket:**
```json
{ "open": false, "nextSlot": null, "source": "booksys", "stale": false }
```

**Booksys API nede — fallback til schedule:**
```json
{ "open": true, "nextSlot": null, "source": "schedule-fallback", "stale": false }
```

---

## Caching

Vercel Edge Function returnerer:

```http
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
X-Status-Source: <source>
Content-Type: application/json; charset=utf-8
```

| Lag | Varighed | Adfærd |
|---|---|---|
| Edge cache (Vercel) | 60 s | Serveres direkte fra edge — ingen Booksys-roundtrip |
| Stale-while-revalidate | 300 s | Efter 60 s serveres stale data mens ny hentes baggrund |
| Browser cache | (samme som edge) | `s-maxage` overstyrer browser cache for shared caches |

> **Observation:** I praksis betyder det Booksys API rammes max ~1 gang/min uanset
> hvor mange brugere der besøger /walk-in. Ved 1.000 besøg/dag = 60 API-calls/min
> spike → ned til 1.

---

## Fail-soft kæde

```
Bruger besøger /walk-in
  ↓
Browser fetcher /api/status
  ↓
Vercel Edge tjekker cache
  ├─ HIT (< 60 s) → serve cached → DONE
  └─ MISS / SWR
      ↓
      Vercel Edge Function kører
        ↓
        fetchAvailability() med 2 s timeout
          ├─ Success → computeStatus(data, hours, now) → returnér
          ├─ Timeout → scheduledStatus(hours, now) → source="schedule-fallback"
          └─ Booksys 5xx → scheduledStatus(hours, now) → source="schedule-fallback"
      ↓
      Edge cache opdateres (60 s)
      ↓
      Browser modtager JSON
        ↓
        walk-in.js mutater DOM:
          [data-status-stamp]
          [data-status-text]
          [data-status-live]
        ↓
        Hvis fetch fejler i browser: server-rendered fallback bevares
        (ingen blank UI, ingen error toast)
```

---

## Sandfærdigheds-kontrakt

Vi har bevidst valgt at *ikke* love mere end vi kan holde:

| Vi viser | Vi viser IKKE |
|---|---|
| Shop-niveau åben/lukket | Per-artist availability |
| `nextSlot` hvis vi rent faktisk har én | Estimater eller "ca. 14:30" |
| `stale: true` flag når data ældre end 5 min | "Live"-claim når data egentlig er cached |
| Schedule-fallback når API er nede | Fake "open"-status for at undgå tom UI |

**Hvorfor så konservativt?**

Hvis status siger "ledig 14:30" og slot faktisk er booked når walk-in arriverer
→ vi har skadet tilliden ved første kontakt. Cost-of-being-wrong > value-of-being-right.

Specifikt per-artist availability ændrer sig sekund-for-sekund i en aktiv shop.
Et statisk view garanterer fejl. Shop-niveau er den højeste granularitet vi
kan reproducere mellem cache-refreshes.

---

## Mock vs real Booksys

### Mock (Sprint 1, current)

`api/_lib/booksys-mock.js` har `fetchAvailability()` der returnerer
pseudo-deterministisk data:

- 12 hourly slots fra "now" og frem
- ~70% chance at være ledig
- Pseudo-seed på dagsnummer (samme shape over én dag — flickerfri)
- `source: "booksys-mock"`

Det er nok til at:
- Verificere walk-in-side renderer korrekt (åben/lukket-cases)
- Verificere fail-soft-kæde virker (kill timeout → trig fallback)
- Test deploy + edge caching ende-til-ende

### Real (Sprint 2, pending Simone-leverance)

Når Simone leverer Booksys API-detaljer:

1. **Endpoint base URL** (er det `inkart.book.dk` eller `inkandart.book.dk`?
   Vi mistænker typo → bør være `inkandart`)
2. **API-doc URL** eller eksempel-response for `/availability` (eller hvad
   endpointet hedder)
3. **Auth-mønster** (Bearer token / OAuth / signed query / IP-allowlist)
4. **Per-artist deep-link URL-pattern** (vores gæt: `?artist={booksysId}`)
5. **Rate limit** (vigtig for at vide om 60s edge-cache er nok)

Swap-procedure: se [runbook.md → Swap mock Booksys til real API](runbook.md#swap-mock-booksys-til-real-api).

---

## isOpenNow — schedule-parser

`api/_lib/booksys-mock.js` eksporterer `isOpenNow(hours, now)` som bruges af
både `computeStatus()` og `scheduledStatus()`.

Parser `site.hours.<weekday>` strings i format `"HH:MM – HH:MM"`.

**Edge case: midnight crossing**
Fre: `13:00 – 05:00` betyder "åben fra fredag 13:00 til lørdag 05:00".
Parser opdager `closes < opens` og lægger 24t til lukke-tiden internt:
```
opens  = 13 * 60      = 780
closes = 5 * 60 + 1440 = 1740
```
Så hvis tid er `02:00` lørdag morgen (= `120` minutter siden midnight),
parser opdager også at `120 < opens` og adjusterer:
```
minNowAdj = 120 + 1440 = 1560   // er stadig <= 1740 → ÅBEN
```

**Test:** kør i en repl:
```js
import { fetchAvailability } from "./api/_lib/booksys-mock.js";
// Mock now-time ved at passe Date direkte:
const fri22 = new Date("2026-05-08T22:00:00+02:00");
const lor02 = new Date("2026-05-09T02:00:00+02:00");
const son08 = new Date("2026-05-10T08:00:00+02:00");
// hvor isOpenNow returnerer true for de første to, false for sidste
```

---

## Stale-detection

`stale: true` flag returneres hvis data er > 5 min gammel.

Pt. **ikke implementeret i mock** — mock returnerer altid `stale: false`.
Når real Booksys er hooked op, vil vi tilføje:

```js
// I status.js efter fetchAvailability:
const ageMs = Date.now() - new Date(availability.fetchedAt).getTime();
payload.stale = ageMs > 5 * 60 * 1000;
```

Forudsætter Booksys returnerer en `fetchedAt`-timestamp. Hvis ikke, brug
`X-Cached-At` header der sættes ved cache-write i edge.

---

## Klient-side

`src/_assets/js/walk-in.js` (~25 linjer):

```js
fetch('/api/status', { headers: { 'Accept': 'application/json' } })
  .then(r => r.ok ? r.json() : Promise.reject(r))
  .then(s => {
    const lbl = labels[lang] || labels.da;
    const line = s.open
      ? (lbl.open + (s.nextSlot ? ' · ' + lbl.nextSlot + ' ' + s.nextSlot : ''))
      : lbl.closed;
    if (s.stale) line += ' ' + lbl.stale;
    [statusStamp, statusText, statusLive].forEach(el => {
      if (el) el.textContent = el === statusLive ? '● ' + line : line;
    });
  })
  .catch(() => { /* leave server-rendered fallback in place */ });
```

**Vigtig design-egenskab:** hvis `fetch()` fejler (network error, CORS, 5xx,
JSON-parse-fejl) **gør vi intet**. Server-rendered HTML har allerede en
sandfærdig fallback ("Walk-ins når vi har tid · 13–23"), og brugeren ser den.

Ingen error-toast. Ingen "Loading..." spinner. Stille degradering.

---

## CSP-overholdelse

`vercel.json`:
```
script-src 'self'
```

Ingen `'unsafe-inline'`. Klient-koden lever derfor i ekstern fil
`/_assets/js/walk-in.js`, IKKE i inline `<script>`.

JSON-LD `<script type="application/ld+json">` blokke er **ikke** påvirket af
script-src CSP — de er data, ikke kode. Browser-parser eksekverer ikke deres
indhold.

---

## Monitoring

Pt. **ingen monitoring** ud over Vercel default request-logs.

Hvis vi ser problemer:
- Vercel dashboard → Functions → `/api/status` viser invocations + errors
- `X-Status-Source` header lader os se hvor mange requests faldback'er
- Hvis `schedule-fallback` rate > 5%, har Booksys problemer

Sprint 2-kandidat: tilføj Vercel Analytics (gratis hobby-tier) til at tracke
fallback-rate over tid.

---

## Failure-modes recap

| Scenario | Adfærd |
|---|---|
| Booksys API 200 OK | `source: "booksys"`, real status |
| Booksys API 5xx eller timeout (>2s) | `source: "schedule-fallback"`, schedule-only |
| Vercel Edge Function crasher | Vercel returnerer 500 → klient-side fetch fejler → server-rendered fallback bevares |
| Vercel hele propellen ned | Edge cache serverer stale data hvis < 5 min gammel; ellers 503 |
| DNS / CDN-issue | Sitet er nede totalt — ingen status at vise |
| Klient JS disabled | Server-rendered fallback bevares — sandfærdig schedule-tekst |

I 99% af tilfældene vil **brugeren se en sandfærdig status** uden at vide om
data kom fra Booksys eller fra schedule.

---

## Ofte stillede spørgsmål

### Hvorfor ikke per-artist availability?

Cost-of-being-wrong > value-of-being-right. Se [Sandfærdigheds-kontrakt](#sandfærdigheds-kontrakt).

### Hvorfor edge function og ikke ren static data?

Vi vil have **realtime** open/closed når Booksys er hooked op. Static rebuild
ved hver booking er ikke skalerbart (Vercel har deploy-rate-limits).

### Hvorfor ikke pull Booksys ved build-tid og lave statiske JSON-filer?

Stale-data risk. Build kører hver ~10 minutter ville være tæt på men
spilder Vercel-build-minutter (gratis-tier har 6.000 min/mo, vi vil ikke
brænde dem på minute-rebuilds).

### Hvorfor 60 s cache, ikke kortere?

Booksys-rate-limit. Plus: realistisk walk-in-flow er at brugeren scanner QR,
klikker book, alt sker over 30-60 s. 60 s cache er stort set ikke synligt
for brugeren men reducerer Booksys-calls med 100x.

### Kan jeg test edge function lokalt?

Ja, med `vercel dev` eller `npx vercel dev`. Kræver Vercel CLI installed
og `.env.local` med relevante env vars sat.

### Hvad hvis Simone vil ændre fallback-tekst?

Ret `walkIn.fallback` i `src/_data/i18n.json` (DA + EN). Push. Done.
