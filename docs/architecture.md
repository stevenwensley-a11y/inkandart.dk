# Architecture

Dette dokument forklarer **hvilke beslutninger vi tog** og **hvorfor**.
Læs det hvis du skal ændre noget fundamentalt — så du ved hvad du bryder.

---

## Stack

| Lag | Valg | Hvorfor |
|---|---|---|
| Static site generator | **Eleventy 3.x** | Mindst kompleksitet for content-volumen. Markdown + Nunjucks templates. Steven kan vedligeholde uden React-kompetence. |
| Hosting | **Vercel** | Gratis-tier dækker behov. Auto-deploy fra `main`. Edge Functions til status-API. EU-edge for performance. |
| CDN + DNS | **Vercel + Simply.com** | Vercel har global CDN. Simply.com har DNS + (fremtidig) email forwarding. |
| Fonts | **Self-hosted woff2** | Privacy: 0 requests til Google Fonts. Plus LCP-optimering via preload. |
| Analytics | **Ingen pt.** | Cookie-banner-infrastruktur klar (default-denied Consent Mode v2), men ingen tracking aktiv. |
| Booking | **Ekstern: Booksys / inkart.book.dk** | Out-of-scope for v0.x. Vi linker dertil. |

### Hvad vi eksplicit ikke valgte

| Alternativ | Hvorfor ikke |
|---|---|
| Next.js / React-port | Overkill. Eleventy + Nunjucks er læsbart for menneske der ikke har dyb React-kompetence. |
| Sanity / Contentful CMS | Content-volumen er for lille. Markdown-front-matter dækker behov. |
| Decap CMS (gratis git-baseret CMS) | Steven er content-pipeline. Vi har ikke brug for visuel editor for én bruger. |
| Cloudflare Pages | Vercel virker. Migration uden klar gevinst. |
| GA4 | Privacy-modsætning. Steven kan tilføje senere via cookie-banner-infra hvis han vil. |
| `@vercel/og` runtime image-generation | Sprint 2 hvis ROI. Pt. bruger artist-side portrætter direkte som og:image. |

---

## Filtreestruktur

```
inkandart.dk/
├── api/                          # Vercel Functions (Edge runtime)
│   ├── _lib/
│   │   └── booksys-mock.js       # Mock-data + computeStatus + scheduledStatus
│   └── status.js                 # GET /api/status — proxy + cache + fallback
│
├── docs/                         # Denne dokumentation
│
├── posters/                      # gitignored — gen via npm run poster
│
├── scripts/
│   ├── images.js                 # eleventy-img wrapper (EXIF-strip + srcset)
│   └── poster.js                 # qrcode + pdf-lib → A4 vinduesposter
│
├── src/
│   ├── _artists/                 # Artist content (Steven editor-flade)
│   │   ├── _artists.11tydata.js  # Pagination over [da, en] + permalink-funktion
│   │   ├── simone.md             # Per-artist markdown med bilingual front matter
│   │   ├── nizar.md, maja.md, jonas.md, liv.md, emil.md
│   │
│   ├── _assets/
│   │   ├── css/style.css         # Single stylesheet — Punk Xerox + sektion 19-22 nye komponenter
│   │   ├── fonts/                # Bebas Neue + Space Mono woff2 (OFL)
│   │   ├── img/                  # Static images
│   │   │   └── artists/<slug>/   # Per-artist portrait + portfolio (genereret af scripts/images.js)
│   │   ├── img-raw/              # gitignored — Steven dropper raw fotos her, scripts processerer
│   │   └── js/
│   │       ├── cookie-consent.js # Default-denied Consent Mode v2
│   │       └── walk-in.js        # /api/status fetch + DOM-mutation
│   │
│   ├── _data/
│   │   ├── booking.json          # Booking-config (mock pt., real efter Simone leverer)
│   │   ├── i18n.json             # UI-strenge DA + EN
│   │   └── site.json             # Brand-niveau data (navn, adresse, hours, etc.)
│   │
│   ├── _includes/
│   │   ├── layouts/
│   │   │   ├── artist.njk        # Per-artist deep-page layout
│   │   │   └── base.njk          # Site-wide layout (head, body, footer, scripts)
│   │   └── partials/
│   │       ├── contact.njk       # Kontakt-card (i info-grid)
│   │       ├── cookie-banner.njk # Cookie consent UI
│   │       ├── footer.njk        # Footer med nav + lang-aware tekst
│   │       ├── head.njk          # <head> med per-page OG + structured data
│   │       ├── hero.njk          # Forside-hero med wordmark + funktionelle stempler
│   │       ├── hours.njk         # Åbningstider-card (lang-aware)
│   │       ├── lang-toggle.njk   # Lang-toggle stempel (DA ↔ EN)
│   │       ├── locations.njk     # Adresse + Maps-card
│   │       ├── services-marquee.njk  # Marquee af service-tags
│   │       └── topbar.njk        # Route-aware topbar nav
│   │
│   ├── en/
│   │   └── privacy.njk           # EN privacy policy (DA er separat fil)
│   │
│   ├── 404.njk                   # 404-side — bruger hero-pattern
│   ├── artister.njk              # Artists index (paginerer DA + EN)
│   ├── index.njk                 # Forside (paginerer DA + EN)
│   ├── privatlivspolitik.njk     # Privatlivspolitik (DA)
│   ├── robots.txt.njk
│   ├── sitemap.njk
│   └── walk-in.njk               # Walk-in-side (paginerer DA + EN)
│
├── .github/
│   ├── lighthouse-config.json    # Lighthouse CI assertions
│   └── workflows/
│       ├── cron-rebuild.yml      # Mandag 03:00 UTC trigger Vercel-deploy
│       └── lighthouse-ci.yml     # Auto-Lighthouse på PRs
│
├── eleventy.config.js            # I18n plugin + custom filtre + collection
├── package.json                  # npm scripts: build, serve, validate, poster, images
└── vercel.json                   # Headers (CSP, HSTS, COOP, CORP), redirects
```

---

## i18n-strategi

Sitet er fuldt bilingual (DA + EN). Vi valgte en **eksplicit-route-strategi** frem
for query-param eller subdomain.

### Routing-konvention

| Type | DA kanonisk | EN kanonisk |
|---|---|---|
| Forside | `/` | `/en/` |
| Walk-in | `/walk-in/` | `/en/walk-in/` |
| Artister index | `/artister/` | `/en/artists/` |
| Artist deep | `/artister/{slug}/` | `/en/artists/{slug}/` |
| Privacy | `/privatlivspolitik/` | `/en/privacy/` |

**Hvorfor danske ord på dansk, engelske på engelsk?** SEO. `/artister/` rangerer
for danske queries; `/en/artists/` rangerer for engelske. Hvis vi havde brugt
`/artists/` på begge sprog, ville vi have ramt midten af to potentielle keywords.

### Implementation

Tre dele:

**1. UI-strenge i `src/_data/i18n.json`** med dot-notation keys:
```json
{
  "nav.walkIn": { "da": "Walk-in", "en": "Walk-in" },
  "cta.bookNow": { "da": "Book tid", "en": "Book now" }
}
```

Brugt i templates via custom `t`-filter:
```njk
{{ "cta.bookNow" | t(lang) }}
```

**2. Pagination over `siteLocales=["da","en"]`** på alle bilingual templates:

Hver side definerer:
```yaml
pagination:
  data: siteLocales
  size: 1
  alias: lang
siteLocales: [da, en]
permalink: "{% if lang == 'en' %}/en/walk-in/{% else %}/walk-in/{% endif %}"
```

Eleventy laver så **én side pr. lokale** fra én kilde-fil. DRY for shared layout/data,
eksplicit for per-locale permalinks.

For artists, samme princip i `src/_artists/_artists.11tydata.js` (directory-data):
```js
pagination: {
  data: "siteLocales",
  size: 1,
  alias: "lang",
},
siteLocales: ["da", "en"],
permalink: function (data) {
  return data.lang === "en"
    ? `/en/artists/${data.slug}/`
    : `/artister/${data.slug}/`;
},
```

> **Naming-conflict-faldgrube:** Hvis du har en artist med fronstmatter `languages: [da, en, sv]`
> (= sprog artisten kan tale) og pagination iterator hedder også `languages`, vil pagination
> iterere over Sve = sv → permalink-konflikt. Vi bruger derfor `siteLocales` til iteration
> og lader artisten beholde `languages`-feltet. Lærepenge dyrt.

**3. `pageLang` + `sisterUrl` filtre** i `eleventy.config.js`:

```js
eleventyConfig.addFilter("pageLang", (url) =>
  url.startsWith("/en/") || url === "/en" ? "en" : "da"
);

eleventyConfig.addFilter("sisterUrl", (url) => { /* DA ↔ EN URL-map */ });
```

Bruges i topbar og lang-toggle:
```njk
{% set lang = page.url | pageLang %}
{% set sister = page.url | sisterUrl %}
```

---

## Data-model

### `src/_data/site.json` — brand-niveau data

Single source of truth for navn, adresse, telefon, hours, social links.
Steven redigerer her når noget ændres. Eleventy auto-rebuild ved push.

### `src/_data/i18n.json` — UI-strenge

Skema: `{ "key": { "da": "...", "en": "..." } }`. Tilgang via `t`-filter.
Tilføj nye keys her hvis der kommer ny UI-tekst.

### `src/_data/booking.json` — booking-config

Mock pt., får real værdier når Simone leverer Booksys-detaljer:
```json
{
  "provider": "booksys-mock",
  "baseUrl": "https://inkart.book.dk",
  "deepLinkPattern": "https://inkart.book.dk/?artist={booksysId}",
  "_pendingFromSimone": [...]
}
```

### `src/_artists/<slug>.md` — per-artist markdown

Front matter er bilingual:
```yaml
name: Simone Chimere
slug: simone
sortOrder: 1
role:
  da: Direktør & artist
  en: Director & artist
styles: [blackwork, fineline, traditional]
instagram: simonechimere
booksysId: 1
languages: [da, en, sv]      # hvilke sprog artisten taler (NB: ≠ siteLocales)
portrait:
  src: portrait.jpg
  alt:
    da: ...
    en: ...
portfolio:
  - { src: 01.jpg, alt: { da: "...", en: "..." } }
bio:
  da: |
    <p>Markdown HTML her...</p>
  en: |
    <p>English HTML here...</p>
```

Body kan være tom — al content lever i front matter. Det giver klar
struktur til translation + senere CMS-migration hvis nødvendigt.

---

## Build-pipeline

```
src/                           ← edit her
  ↓
eleventy.config.js             ← collections, filters, plugins
  ↓
Eleventy build                 ← npm run build
  ↓
_site/                         ← generated, gitignored
  ↓
html-validate                  ← npm run validate
  ↓
[Vercel deploy]                ← auto on push to main
  ↓
Edge functions (api/*)         ← deployed parallelt
  ↓
Lighthouse CI                  ← på PRs (.github/workflows)
```

Build-tid: < 0.3 s for 23 sider. Edge function deploy: < 30 s.

---

## CI/CD

### `.github/workflows/lighthouse-ci.yml`

Kører Lighthouse på hver PR. Asserts:
- Performance ≥ 0.85
- Accessibility ≥ 0.95
- Best practices ≥ 0.9
- SEO ≥ 0.9

Test-suiten er 8 kerneruter (home/walk-in/artister/artist-deep × DA + EN).
Action: [`treosh/lighthouse-ci-action@v11`](https://github.com/treosh/lighthouse-ci-action).

### `.github/workflows/cron-rebuild.yml`

Hver mandag 03:00 UTC committer en marker-fil → Vercel auto-deploy.
Formål: holde `© {{ now | date('%Y') }}` friskt + lade os bygge time-based
content (status-fallback, masthead) uden manuel intervention.

> **Branch protection note:** Hvis Steven slår branch protection til på `main`,
> skal `github-actions[bot]` whitelist'es eller workflowet konverteres til at
> committe på en sub-branch + auto-merge.

### `vercel.json` — security headers

8 headers konfigureret pr. PR #9 + Sprint 1:
- `Content-Security-Policy` — strict, ingen `'unsafe-inline'`, ingen 3rd-party
- `Strict-Transport-Security` — 1 år max-age + includeSubDomains
- `Permissions-Policy` — null camera/mic/geo/payment
- `Referrer-Policy` — strict-origin-when-cross-origin
- `Cross-Origin-Opener-Policy` — same-origin
- `Cross-Origin-Resource-Policy` — same-origin
- `X-Content-Type-Options` — nosniff
- `X-Frame-Options` — DENY (legacy IE11 fallback)

Plus cache-headers:
- `/_assets/fonts/(.*)` — 1 år immutable
- `/_assets/img/(.*)` — 30 dage

---

## Hvad vi eksplicit ikke byggede

### Wall of names (skippet)
Steven besluttede drop. Begrundelse:
- **GDPR-consent**: at navngive identificerbare personer (selv kun fornavn) på
  kommerciel hjemmeside kræver eksplicit samtykke. 30+ samtaler.
- **Vedligeholds-risiko**: hvis ÉN person på listen siger "fjern mig" og vi
  ikke gør det hurtigt, har vi en GDPR-klage.
- **Stale-faktor**: statisk liste går død i 12 måneder. Hvem opdaterer?

Alternativ vi ikke heller byggede: pull seneste IG-mentions tagget @ink.and.art.cph.
Kan tages op igen i Sprint 2 hvis Steven ser værdi.

### Live per-artist availability (afvist)
Vi viser **shop-niveau** open/closed + next-free-slot, ikke per-artist. Hvorfor:
- Per-artist availability ændrer sig sekund-for-sekund i en aktiv shop
- Hvis status siger "Maja ledig 14:30" og Maja faktisk er booked → vi har
  skadet tilliden ved første kontakt
- **Cost-of-being-wrong > value-of-being-right**

### iOS Shortcut til manuel status-update (afvist)
Original plan: hvis Booksys ikke havde API, skulle Simone manuelt toggle
status via iOS Shortcut. Da Booksys har API, drop hele sporet.

### `@vercel/og` runtime image generation (parkeret)
Per-artist OG-images bruges pt. som direct-portrait (`og:image` peger på
`/_assets/img/artists/<slug>/portrait.jpg`). Det virker. Branded social-share
preview med wordmark+navn er en Sprint 2-feature hvis ROI viser sig.

### CMS-UI for Simone (afvist)
Decap CMS giver `/admin`-rute med visual editor. Skip — Steven er
content-pipeline. Markdown-direct-edit i GitHub er hurtigere end CMS-flade
for én bruger.

---

## Kendte tekniske gæld

| Item | Hvor | Sprint |
|---|---|---|
| Booksys API er mock | `api/_lib/booksys-mock.js` | 2 |
| Real artist-content er stub | `src/_artists/*.md` | 2 (efter Simone leverer) |
| Per-artist OG ikke compositted | `head.njk` bruger portrait direkte | 2 |
| `@vercel/og` ikke installeret | — | 2 |
| Image-pipeline ikke kørt mod real data | `scripts/images.js` venter | 2 |
| `R2` migration for portfolio-billeder | — | 1.5 eller 2 |
| Hardkodet `SENEST OPDATERET 2026-05-02` | `topbar.njk` | 2 |
| Cookie-banner stadig live trods 0 tracking | `partials/cookie-banner.njk` | Open question — kan måske droppes |
