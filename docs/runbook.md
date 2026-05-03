# Runbook — Stevens operationelle playbook

Step-by-step opskrifter på de operations der oftest skal laves. Alt der står
her skal kunne udføres uden at læse koden.

---

## Indholdsfortegnelse

1. [Tilføj en ny artist](#tilføj-en-ny-artist)
2. [Bearbejd nye billeder](#bearbejd-nye-billeder)
3. [Generér vindues-poster](#generér-vindues-poster)
4. [Opdater åbningstider](#opdater-åbningstider)
5. [Opdater UI-strenge (i18n)](#opdater-ui-strenge-i18n)
6. [Swap mock Booksys til real API](#swap-mock-booksys-til-real-api)
7. [Deploy en content-ændring](#deploy-en-content-ændring)
8. [Roll back en dårlig deploy](#roll-back-en-dårlig-deploy)
9. [Tilføj en ny route](#tilføj-en-ny-route)
10. [Update privatlivspolitik (DA + EN)](#update-privatlivspolitik-da--en)
11. [Common gotchas](#common-gotchas)

---

## Tilføj en ny artist

**Når:** Simone hyrer en ny tatovør / piercer.

**Tid:** 15-30 min inkl. content-typing (ekskl. Simones leverance af portræt + bio).

### Steps

```bash
# 1. Hent content fra Simone:
#    - Fornavn + (efter)navn
#    - Rolle (tatovør / piercer / direktør)
#    - Stil-tags (blackwork, fineline, traditional, etc.)
#    - Instagram-handle (uden @)
#    - Booksys-ID (kan komme senere)
#    - 1 portræt-foto (helst 1:1 eller portræt-orientering)
#    - Bio: 2-3 sætninger på dansk + engelsk
#    - Hvilke sprog artisten taler

# 2. Drop portrættet i raw-mappen
mkdir -p src/_assets/img-raw/maria/
cp ~/Downloads/maria-portrait.jpg src/_assets/img-raw/maria/portrait.jpg

# 3. Drop portfolio-billeder hvis Simone har leveret dem
cp ~/Downloads/maria-tats/*.jpg src/_assets/img-raw/maria/

# 4. Bearbejd billeder
npm run images
# → genererer src/_assets/img/artists/maria/{portrait,01,02,...}-{400,800,1200,1600}.{webp,jpg}
# → strips EXIF (privacy + GPS-leak protection)
# → 4 widths × 2 formats per source

# 5. Opret artist markdown
cp src/_artists/simone.md src/_artists/maria.md
# → rediger frontmatter til Marias content
```

### Markdown-template

Brug `simone.md` som skabelon. Felter du skal opdatere:

```yaml
---
name: Maria Eksempel              # 1. Fuldt navn (display)
slug: maria                       # 2. URL-slug (ASCII, kebab-case)
sortOrder: 7                      # 3. Sortering på /artister/-grid (lavere = tidligere)
role:
  da: Tatovør
  en: Tattooer
styles: [neo-traditional, color]  # 4. Stil-tags (lowercase, kebab-case)
instagram: maria.eksempel.ink     # 5. IG-handle uden @
booksysId: 7                      # 6. Booksys-ID (eller null indtil vi har det)
languages: [da, en]               # 7. Hvilke sprog hun taler (≠ siteLocales!)
portrait:
  src: portrait.jpg
  alt:
    da: Maria foran sit studio
    en: Maria outside the studio
portfolio:                        # 8. Liste af portfolio-billeder (kan være tom)
  - { src: 01.jpg, alt: { da: "...", en: "..." } }
bio:                              # 9. Bilingual HTML
  da: |
    <p>Marias bio på dansk...</p>
  en: |
    <p>Maria's bio in English...</p>
---
```

### Verifikation

```bash
npm run build
# → Skal logge:
#   Writing ./_site/artister/maria/index.html from ./src/_artists/maria.md
#   Writing ./_site/en/artists/maria/index.html from ./src/_artists/maria.md
# Hvis kun ét output → frontmatter er ikke parset korrekt

npm run validate
# → 0 fejl

npm run serve
# → http://localhost:8080/artister/ og /artister/maria/ + /en/-versioner
```

### Commit + push

```bash
git checkout -b content/add-maria-eksempel
git add src/_artists/maria.md src/_assets/img/artists/maria/
git commit -m "content: tilføj artist Maria Eksempel"
git push -u origin content/add-maria-eksempel
# → Open PR på GitHub, merge når godkendt
# → Vercel auto-deploy ~30s
```

---

## Bearbejd nye billeder

**Når:** Simone har afleveret nye fotos (portræt eller portfolio).

**Tid:** 1-3 min for op til 30 billeder.

### Hvad scriptet gør

`npm run images` (= `node scripts/images.js`):

1. Læser alle directories i `src/_assets/img-raw/`
2. For hver mappe (= artist-slug):
   - Finder alle `.jpg`, `.png`, `.heic`, `.heif`, `.webp`, `.tiff`
   - Genererer 4 widths (400/800/1200/1600px) × 2 formater (WebP + JPEG)
   - **Strips ALL EXIF** (privacy: ingen GPS, kamera-info, eller fingerprint)
   - Output til `src/_assets/img/artists/<slug>/`

### Steps

```bash
# 1. Drop billeder i raw-mappe (en per artist)
cp ~/Desktop/simone-new-shoot/*.jpg src/_assets/img-raw/simone/

# 2. Kør pipeline
npm run images

# Output i konsol:
#   [simone] processing 6 images...
#     ✓ portrait.jpg → 8 variants
#     ✓ 01.jpg → 8 variants
#     ✓ 02.jpg → 8 variants
#   ✓ Done. 1 artist directory processed.

# 3. Tjek output
ls src/_assets/img/artists/simone/
# portrait-400.webp portrait-400.jpg portrait-800.webp ...

# 4. Tilføj portfolio-billederne i markdown
# (rediger src/_artists/simone.md → tilføj entries i portfolio-arrayet)

# 5. Build + verify
npm run build
npm run serve
# http://localhost:8080/artister/simone/ — billeder skal renderes
```

### Når raw-mappe ikke skal committes

`src/_assets/img-raw/` er **gitignored**. Steven beholder originaler lokalt.
Kun `_assets/img/artists/<slug>/` (web-optimerede varianter) committes.

### Tilføj portfolio til markdown

Efter `npm run images`, rediger `src/_artists/<slug>.md`:

```yaml
portfolio:
  - { src: 01.jpg, alt: { da: "Blackwork-rygtatovering",   en: "Blackwork back piece" } }
  - { src: 02.jpg, alt: { da: "Fineline-rose på underarm", en: "Fineline rose on forearm" } }
  - { src: 03.jpg, alt: { da: "Traditional anker",         en: "Traditional anchor" } }
```

`src` peger på filenavn i `src/_assets/img/artists/<slug>/` (uden width-suffix
— browseren vælger via srcset).

---

## Generér vindues-poster

**Når:** Steven skal printe en ny QR-poster til vinduesmonteret eller event.

**Tid:** 30 sek + print.

### Steps

```bash
# Dansk poster (default)
npm run poster
# → posters/walk-in-da-2026-05-03.pdf (~15 KB)

# Engelsk poster
npm run poster:en
# → posters/walk-in-en-2026-05-03.pdf

# Custom URL (fx kampagne med utm-params)
npm run poster -- --url=https://inkandart.dk/walk-in?from=window&utm_campaign=spring2026
```

### Hvad posteren indeholder

- A4 portrait, 210x297mm
- Top-stripe rød (Punk Xerox)
- "INK & ART" headline + "WALK-IN" subheadline
- 32×32cm QR-kode (error correction H — scanner gennem vinduesglas på 1m)
- "SCAN MED TELEFONEN" / "SCAN WITH YOUR PHONE"
- Footer-stripe med inkandart.dk + URL
- ASCII-only (Helvetica builtin) — ingen unicode-glyphs

### Print-anbefaling

- A4, hvidt papir (paper-bg er digital — vi bruger blank hvidt for poster)
- Farve-print (hvis muligt) — den røde top-stripe ER brand-signaturen
- Laminerring (vinduet er udsat for sol + regn) — eller print et nyt poster
  hver 6. måned

### Output-mappe

`posters/` er **gitignored** — regenerer altid via `npm run poster` frem for
at committe PDF'er.

---

## Opdater åbningstider

**Når:** Simone ændrer åbningstid (helligdag, ny ugentlig rytme).

**Tid:** 1 min + commit.

### Steps

1. Rediger `src/_data/site.json`:
   ```json
   "hours": {
     "monday":    "13:00 – 23:00",
     "tuesday":   "13:00 – 23:00",
     "wednesday": "13:00 – 23:30",
     "thursday":  "13:00 – 02:00",
     "friday":    "13:00 – 05:00",
     "saturday":  "14:00 – 05:00",
     "sunday":    "13:00 – 23:00"
   }
   ```

2. Verificer format:
   - `"HH:MM – HH:MM"` (en-dash mellem)
   - Hvis lukker efter midnat: brug 24h-format > 24h er ikke gyldigt; brug
     real klokkeslæt (fx `"02:00"` for kl. 02 natten efter)
   - `isOpenNow()` i `api/_lib/booksys-mock.js` håndterer midnight-crossing

3. Commit + push:
   ```bash
   git add src/_data/site.json
   git commit -m "content: opdater åbningstider — fredag nu 13–05"
   git push origin main
   ```

4. Verificer post-deploy:
   - Hours-card på `/` viser nye tider
   - JSON-LD `openingHoursSpecification` i page-source viser nye tider
     (Google scrap'er det inden for ~1 uge)
   - `/walk-in/` status-fallback-tekst viser nye tider

### Edge case: nat-skift på fre/lør

Standard pattern er `13:00 – 05:00` på fre/lør (åbent indtil tidlig morgen).
`isOpenNow()` opdager `closes < opens` og lægger 24t til lukke-tiden internt.

Test: kl. 02:00 lørdag morgen, status skal vise "ÅBEN NU".

---

## Opdater UI-strenge (i18n)

**Når:** Du tilføjer en ny knap, label, eller heading der skal være på
begge sprog.

### Steps

1. Tilføj key i `src/_data/i18n.json`:
   ```json
   {
     "cta.bookSlot": {
       "da": "Book et slot",
       "en": "Book a slot"
     }
   }
   ```

2. Brug i template:
   ```njk
   {% set lang = page.url | pageLang %}
   <button>{{ "cta.bookSlot" | t(lang) }}</button>
   ```

3. Build + verify begge sprog renderes korrekt:
   ```bash
   npm run build
   grep "Book et slot" _site/index.html        # DA
   grep "Book a slot"  _site/en/index.html     # EN
   ```

### Konventioner

- **Dot-notation keys** grupperet efter formål: `nav.*`, `cta.*`, `hero.*`,
  `walkIn.*`, `artists.*`, `footer.*`, `common.*`
- **Hold strenge korte** — knapper og labels, ikke prosa
- **Lang prosa** lever i markdown front matter eller direkte i template med
  `{% if lang == "en" %}...{% else %}...{% endif %}` — i18n.json er for
  reusable UI-strenge

### Hvis du tilføjer en helt ny lokale (fx svensk)

1. Tilføj `sv` til alle keys i `i18n.json`
2. Tilføj `"sv"` til `siteLocales`-arrays i `index.njk`, `walk-in.njk`,
   `artister.njk`, `_artists.11tydata.js`
3. Tilføj `/sv/`-permalinks i samme templates
4. Tilføj `sv`-grene i `pageLang` + `sisterUrl` filtre
5. Tilføj `sv`-tekster i alle steder hvor `{% if lang == "en" %}` ellers
   ville cover EN

> **Det er en stor refactor.** Out-of-scope for v0.x. Sprint 3+ hvis ROI viser sig.

---

## Swap mock Booksys til real API

**Når:** Simone har leveret Booksys API-detaljer (endpoint, auth-mønster,
deeplink-URL-pattern).

**Tid:** 30-60 min inkl. testing.

### Steps

1. **Tilføj Vercel env var** for API-token:
   ```bash
   # I Vercel dashboard → project → Settings → Environment Variables:
   BOOKSYS_TOKEN = "din-rigtige-token"
   BOOKSYS_API_URL = "https://api.booksys.dk/v1"  # eller hvad det er
   ```

2. **Opret real fetch-funktion** i `api/_lib/booksys-real.js`:
   ```js
   export async function fetchAvailability(now = new Date()) {
     const r = await fetch(`${process.env.BOOKSYS_API_URL}/availability`, {
       headers: { 'Authorization': `Bearer ${process.env.BOOKSYS_TOKEN}` },
       signal: AbortSignal.timeout(2000),
     });
     if (!r.ok) throw new Error(`Booksys ${r.status}`);
     const data = await r.json();
     // Transform Booksys-shape til vores interne shape:
     // { slots: [{ start: ISO8601, end: ISO8601, free: bool }, ...] }
     return {
       slots: data.someShape.map(transformSlot),
       source: "booksys"
     };
   }
   ```

3. **Update `api/status.js`** til at bruge real-fetch:
   ```diff
   - import { fetchAvailability, computeStatus, scheduledStatus } from "./_lib/booksys-mock.js";
   + import { fetchAvailability } from "./_lib/booksys-real.js";
   + import { computeStatus, scheduledStatus } from "./_lib/booksys-mock.js";
   ```
   (Behold `computeStatus` + `scheduledStatus` — kun `fetchAvailability` skifter.)

4. **Update `src/_data/booking.json`** med real deeplink-pattern:
   ```diff
   - "deepLinkPattern": "https://inkart.book.dk/?artist={booksysId}",
   + "deepLinkPattern": "https://inkart.book.dk/booking/artist/{booksysId}",  // eller hvad real pattern er
   - "_pendingFromSimone": [...]
   ```

5. **Update artist markdowns med real `booksysId`**:
   ```yaml
   booksysId: real-id-fra-booksys-system
   ```

6. **Test lokalt** med vercel dev:
   ```bash
   vercel dev --listen 3000
   # → http://localhost:3000/api/status
   # Skal returnere real data hvis BOOKSYS_TOKEN er sat lokalt (.env.local)
   ```

7. **Verificer fail-soft** — hvis API er nede:
   ```bash
   # Disconnect netværk eller ugyldigt token →
   # /api/status skal returnere scheduled-fallback uden 500
   ```

8. **Commit + deploy**:
   ```bash
   git checkout -b feat/booksys-real-api
   git add api/_lib/booksys-real.js api/status.js src/_data/booking.json
   git commit -m "feat: swap mock Booksys til real API"
   git push
   # PR + merge → Vercel auto-deploy
   ```

### Verifikation post-deploy

```bash
curl -sL https://inkandart.dk/api/status | jq
# {
#   "open": true,
#   "nextSlot": "14:30",
#   "source": "booksys",        ← "booksys" ikke "booksys-mock"
#   "stale": false
# }

# Hvis fallback aktiveres:
# "source": "schedule-fallback"
```

---

## Deploy en content-ændring

**Når:** Steven har redigeret site.json, en artist-md, eller anden non-code content.

**Tid:** ~1 min commit + ~30 s Vercel deploy.

### Standard-flow

```bash
# 1. Lokal verifikation
npm run build && npm run validate

# 2. Commit + push direkte til main (for små content-ændringer)
git add src/_data/site.json
git commit -m "content: opdater åbningstider på fredag"
git push origin main

# 3. Vercel deploy starter automatisk
# Følg på https://vercel.com/<team>/<project>/deployments
```

### For større ændringer (ny feature, mange filer)

Gå via PR:
```bash
git checkout -b feat/your-feature
# ... lav ændringer ...
git push -u origin feat/your-feature
# Open PR på GitHub
# Lighthouse CI kører automatisk
# Merge når godkendt → Vercel auto-deploy
```

---

## Roll back en dårlig deploy

**Når:** Steven har pushet noget der breaker prod, og redigering kan ikke
nås før Simones bookingsspike kommer.

### Hurtigt roll back via Vercel-dashboard

1. https://vercel.com/<team>/<project>/deployments
2. Find den seneste **fungerende** deploy (før den brækkede)
3. Klik "Promote to Production" → live på 5 sek
4. Senere: ret koden lokalt, push fix

### Roll back via git revert

```bash
git checkout main
git pull
git revert HEAD            # Eller specific SHA
git push origin main
# → Vercel deploy ~30 s
```

`revert` skaber en NY commit der undoer den sidste — bevarer historik.

> **Aldrig `git push --force` til main.** Vercel build-cache + branch-protection
> kan blive forvirret. Brug `revert` selv om historikken bliver lidt fed.

---

## Tilføj en ny route

**Når:** Du skal tilføje fx `/journal/`, `/press/`, `/faq/`.

### Hvis ruten skal være bilingual (DA + EN)

1. Opret `src/journal.njk`:
   ```yaml
   ---
   layout: layouts/base.njk
   pagination:
     data: siteLocales
     size: 1
     alias: lang
   siteLocales: [da, en]
   permalink: "{% if lang == 'en' %}/en/journal/{% else %}/journal/{% endif %}"
   eleventyComputed:
     title: "{% if lang == 'en' %}Journal · ...{% else %}Journal · ...{% endif %}"
   ---
   <section>...</section>
   ```

2. **Opdatér `partials/topbar.njk`** med ny `{% elif page.url == "/journal/" or page.url == "/en/journal/" %}` gren

3. **Opdatér `sisterUrl`-filteret i `eleventy.config.js`**:
   ```js
   const map = {
     "/":                      "/en/",
     "/walk-in/":              "/en/walk-in/",
     "/artister/":             "/en/artists/",
     "/journal/":              "/en/journal/",   // ← tilføj
     ...
   };
   ```

4. **Tilføj nav-links i `partials/footer.njk`** + evt. hero-stempler

5. **Tilføj i Lighthouse CI** — `.github/lighthouse-config.json` `url`-array

### Hvis ruten kun er ét sprog

Drop pagination-front-matter, bare:
```yaml
---
layout: layouts/base.njk
permalink: /journal/
title: Journal
---
```

---

## Update privatlivspolitik (DA + EN)

**Når:** Vi tilføjer en ny tredjepart, ændrer cookie-praksis, eller en
revision af GDPR-praksis.

1. Rediger BÅDE `src/privatlivspolitik.njk` og `src/en/privacy.njk`
2. Opdatér dato i `partials/topbar.njk` (linje med `SENEST OPDATERET YYYY-MM-DD`)
3. Forfeit version-tracking — committen er logbogen
4. Commit:
   ```bash
   git commit -m "legal: opdater privatlivspolitik §4 — fjern Vercel-reference (skiftet hosting)"
   ```

> **Datoen i topbar er hardkodet** indtil Sprint 2 hvor vi auto-bumper via
> page front matter eller git log. Husk at bumpe manuelt indtil videre.

---

## Common gotchas

### "Output conflict: multiple input files writing to same path"

Pagination-konflikt. Tjek:
- Bilingual templates skal bruge `siteLocales` (ikke `languages`) som pagination-data
- Permalink-funktion skal returnere forskellige paths for `lang === 'en'` vs `'da'`

### `t`-filter returnerer key i stedet for tekst

- Verificer key findes i `src/_data/i18n.json`
- Verificer dot-notation er korrekt (`"nav.walkIn"`, ikke `"navWalkIn"`)
- Verificer `lang`-variabel er sat i scope (`{% set lang = page.url | pageLang %}`)

### `npm run images` fejler på `.heic`

`sharp` kan håndtere HEIC men kun hvis libvips er bygget med HEIF-support.
På macOS Homebrew burde det virke. På Linux CI kan du brug `imagemagick`-konvertering
manuelt først:
```bash
magick mogrify -format jpg src/_assets/img-raw/<slug>/*.heic
rm src/_assets/img-raw/<slug>/*.heic
npm run images
```

### Lighthouse CI assertion fejler i PR

Tjek hvilken kategori der fejlede:
- **Performance < 0.85**: Tjek om vi har tilføjet 3rd-party requests, store
  ubeskårne billeder, eller render-blocking CSS
- **A11y < 0.95**: Manglende alt-tekst, kontrast-fejl, missing landmarks
- **SEO < 0.9**: Manglende meta-description, broken links, missing hreflang

Lokal-test: `npx lhci collect --config=.github/lighthouse-config.json` med
`_site/` bygget først.

### Vercel deploy fejler på Edge Function

`api/status.js` bruger `import siteData from "../src/_data/site.json" with { type: "json" }` —
dette virker i Node 20+. Hvis Vercel-runtime er for gammel, bytter det til
fetch-from-disk-pattern eller inline-data. Edge runtime understøtter import-attributes pr. 2024.

### `_artists/<slug>.md` rendrer ikke

- Tjek frontmatter er gyldig YAML (test med `node -e "require('js-yaml').load(...)"`)
- Tjek `slug`-feltet matcher filnavnet (uden `.md`)
- Tjek `npm run build` log for "Output: ./_site/artister/<slug>/index.html" + EN-version

### Cookie-banner kommer aldrig frem

- Browser fresh `localStorage` — banner kun synes ved første besøg
- Test med inkognito eller `localStorage.clear()` i devtools
- Banner kan ikke vise hvis JS er disabled (acceptabel — vi loader 0 tracking
  alligevel)
