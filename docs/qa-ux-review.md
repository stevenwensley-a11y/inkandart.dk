# QA & UX-review — inkandart.dk (v0.1)

Fuld gennemgang af repoet: alle templates, partials, CSS, JS, data og config.
Build kørt (`npm run build`), HTML valideret (`npm run validate`), genereret
markup inspiceret.

---

## 🔴 Kritiske fund (bør fixes før næste deploy)

### 1. Personlig Gmail eksponeret offentligt
`src/_data/site.json:11` — `nizarsaad5@gmail.com` renderes i markup,
mailto-links **og** i `schema.org`-JSON-LD. Det er:

- Et spam-magnet (scrapes inden for dage)
- Ikke en business-adresse → underminerer brand-troværdighed
- README nævner allerede planen om `kontakt@inkandart.dk` — den bør
  prioriteres, eller brug i mellemtiden en kontaktformular (Formspree /
  Web3Forms gratis-tier).

### 2. Manglende privatlivspolitik (juridisk pligt)
Cookie-banneret findes, men der er ingen `/privatlivspolitik` eller
`/cookies`-side. Under GDPR + ePrivacy skal samtykkeløsningen henvise
til en politik der oplyser dataansvarlig, formål, opbevaringstid.
Datatilsynet kan give bøder for dette.

### 3. Cookie-banner sætter samtykke før der findes nogen tracking
`src/_assets/js/cookie-consent.js` initialiserer Consent Mode v2 og
lytter på accept — men ingen GA4 loades. Brugere bedes om samtykke til
noget der ikke eksisterer. Enten:

- Skjul banneret indtil GA4 faktisk er konfigureret, **eller**
- Tilføj GA4 nu og lever op til løftet.

Banneret mangler også en "skift samtykke senere"-link i footer
(best practice fra cookieinformation.dk).

### 4. HTML-validate fejler med 13 fejl
```
- tel-non-breaking (× 9): brug &nbsp; mellem ciffergrupper i telefonnumre
- unique-landmark (× 2): to <nav aria-label="Sociale medier"> — skal være unikke
- prefer-tbody (× 1): hours-tabel mangler <tbody>
- no-trailing-whitespace (× 1) i index.njk
```
Hurtige fixes (~15 min), men bryder CI hvis der tilføjes en check
i Vercel.

### 5. Inkonsistens: "studiokæde" vs. ét studio
Tagline siger *"Tatovør- og piercing studiokæde"* — men `locations.njk`
viser kun én adresse. Enten ret tagline, eller hvis der reelt er flere
placeringer, gør `address` til array og loop.

### 6. Åbningstider ser usandsynlige ud
Fre 13:00–05:00 og lør 14:00–05:00 for en tatovørbutik er meget
usædvanligt. README bekræfter: data er ~3 år gammelt fra Facebook.
Indtil bekræftet, vis enten konservative tider eller en banner
"Ring for åbningstider". Forkerte tider = mistet tillid + dårlig
Google-business-konsistens.

---

## 🟡 Vigtige forbedringer

### SEO / Schema
- `TattooParlor` schema dækker ikke piercing — tilføj `makesOffer` med
  `Service`-noder for både tatovering og piercing
- `priceRange: "$$"` — for et dansk publikum giv `priceMin/priceMax`
  eller fjern; `$$` er en US-konvention
- Manglende `geo`-koordinater på `PostalAddress` (Google Maps-integration
  bliver bedre)
- Manglende `aggregateRating` — bygges når reviews kommer
  (Google Business Profile)
- `sitemap.xml` bruger `page.date` som default = build-dato, ikke
  indholdsdato. Tilføj `date` i front-matter for stabil `lastmod`.

### Performance / Loading
- Google Fonts blokerer rendering (preconnect hjælper, men selvhostet
  WOFF2 + `font-display: swap` er hurtigere). README har dette på
  v0.2-listen.
- Logo er 240×296 PNG — konverter til WebP/SVG (README bekræfter SVG
  mangler)
- `og-image.png` har ingen `og:image:width`/`height` — Facebook/LinkedIn
  rendering bliver bedre med disse.

### Tilgængelighed
- Mørkt tema (#0a0a0a / #f5f5f0) har god kontrast (~17:1) ✅
- `:focus-visible` outline ✅
- Skip link ✅
- Men: kontakt-listens `<span class="contact__label">` er ikke semantisk
  forbundet til værdien. Brug `<dl><dt><dd>` i stedet for
  `<ul><li><span>`.
- `hours__table` mangler `<caption>` (selv hvis visuelt skjult — for
  skærmlæsere)
- Smooth-scroll JS er dead code — ingen interne `#`-anker findes på
  siden. Slet eller tilføj nav.

### Booking-flow
- `bookingUrl: https://inkart.book.dk` — bemærk *inkart* uden "and"
  (samme problem som Instagram-bio nævnt i README). Verificér at det
  faktisk er den rigtige booking-platform og ikke en konkurrent.

### Mobil-UX
- Ingen sticky CTA — på lang mobilscroll skal brugeren tilbage til hero
  for at booke. Tilføj en `position: sticky` bottom bar på mobil med
  "Ring" + "Book".
- Telefonnummer i kontakt er klikbart, men på mobile er en stor
  "Ring nu"-knap mere konverteringsorienteret end et tekstlink.

---

## 🟢 Det her virker godt

- Eleventy-arkitekturen er clean, single source of truth via `site.json`
- `schema.org` JSON-LD til stede
- Vercel www → apex redirect korrekt
- `prefers-reduced-motion` respekteret
- Skip link, semantiske landmarks, focus-styles
- Mørkt tatovørbrand-look passer til segmentet

---

## 💡 Forslag til nye undersider (UX + SEO + konvertering)

Sorteret efter ROI for et tatovør-/piercingstudio i Indre By:

| Side | Hvorfor | Effekt |
|------|---------|--------|
| **`/pleje`** (tatovering & piercing aftercare) | Topsøgt på Google ("hvordan plejer jeg en tatovering"), bringer tidligere kunder tilbage, viser ekspertise | SEO + retention |
| **`/priser`** | #1 indvending før booking. "Min. 800 kr, timepris 1500 kr, piercing fra 350 kr". Filtrerer dårlige leads | Konvertering |
| **`/artists`** | Hver artist en profil med stil + IG-link + bio. Kunder vælger artist før studie | Differentiering |
| **`/galleri`** eller **`/portfolio`** | Visuelt bevis. Filterbar på stil (traditional, blackwork, fineline, dotwork, japansk) | Tillid + SEO |
| **`/walk-in`** | "Ledig artist i dag?" — selv en simpel "Ring 555 24 86 08 for status" konverterer turister fra Strøget | Walk-in trafik |
| **`/faq`** | Smerter, alder (18 år / forældresamtykke), alkohol/medicin før, hvor lang tid tager det, retoucheringspolitik | Reducerer support-spørgsmål |
| **`/booking-guide`** | Hvad sker der efter book? Depositum? Skitsesamtale? Annullering? | Lavere no-show |
| **`/gavekort`** | Stort kommercielt potentiale (jul, fødselsdag, runde dage). Sælg via Stripe Payment Link uden CMS | Direkte indtjening |
| **`/flash`** eller **`/events`** | Flash days, gæsteartister, popup-events. Skaber FOMO og IG-trafik | Engagement |
| **`/hygiejne`** | "Sundhedsstyrelsen-anbefalet hygiejne, single-use nåle, autoklaveret udstyr". Stort tillidssignal | Tillid |
| **`/anmeldelser`** | Embed Google reviews + Trustpilot widget | Social proof |
| **`/kontakt`** | Med formular (Formspree/Web3Forms) → fjerner Gmail-eksponering | Privacy + leads |
| **`/privatlivspolitik`** + **`/cookies`** | Juridisk krav, se ovenfor | Compliance |
| **`/en/`** | Indre By har massivt turist-publikum. EN-version med samme template + `_data/site.en.json` | Internationalt segment |

### Lavthængende kreative tilføjelser (på forsiden, ikke nye sider)

- **"Åbent nu"-badge** beregnet i JS ud fra `hours`-data — grøn prik +
  "Åbent indtil 23:00"
- **Bookable artist preview** — 3-4 IG-billeder hentet fra studie-IG
  via oEmbed
- **Mini-prisindikator** i hero ("Tatovering fra kr. 800 · Piercing fra
  kr. 350")
- **Telefon-knap der ringer direkte på mobil** som primær CTA ved siden
  af "Book tid"
- **"Find os"-mini-kort** (statisk Google Maps-billede, lazy-loaded)
- **Rejsetid fra Nørreport / Rådhuspladsen** — "5 min gå fra Strøget"

---

## Anbefalet næste sprint

**Quick win-runde (~1-2 timer):**
1. Fix HTML-validate fejl (13 stk.)
2. Fjern Gmail fra public markup → kontaktformular
3. Tilføj `/privatlivspolitik` + `/cookies` stubs
4. Tilføj sticky mobil-CTA
5. Tilføj "Åbent nu"-badge
6. Bekræft åbningstider med Simone

**Indholdssprint (~1 uge):**
1. `/priser` — konkrete tal
2. `/artists` — bio + IG + stil
3. `/galleri` — 12-20 foto, filterbar på stil
4. `/pleje` — aftercare-guide

**v0.3:**
- EN-version
- Selvhostede fonts
- GA4 + Consent Mode v2 fuldt aktiv
- Trustpilot/Google reviews-widget
