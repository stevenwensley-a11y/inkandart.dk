# UX Journey — på tværs af alle ruter

Dette dokument beskriver hvordan en bruger bevæger sig gennem sitet, og
hvilke konsistens-mønstre vi har bygget for at gøre rejsen sammenhængende.

Skrevet for Claude Design som skal polere frontend, men også brugbart for
Steven der vil forstå *hvorfor* en bestemt komponent ligger hvor den ligger.

---

## Bruger-personas (kort)

| Persona | Entry | Mål |
|---|---|---|
| **Lokal først-gangs-besøgende** | Google "tatovør København" → `/` | Forstå hvem vi er, beslutte om de vil booke |
| **Turist på Strøget** | QR i vinduet → `/walk-in/?from=window` (eller `/en/walk-in/`) | Hurtig "kan jeg gå ind?"-svar |
| **Stamkunde** | Direkte til `/walk-in/` eller IG-bio til `/artister/<navn>/` | Tjekke åbent/bookke specifik artist |
| **Følgesvend i Simones IG** | IG-bio til `/artister/simone/` | Se Simones portfolio + book hos hende |

---

## Site-tree (efter Sprint 1)

```
/                              ← Forside (DA)
/en/                           ← Forside (EN)
/walk-in/                      ← Walk-in (DA)
/en/walk-in/                   ← Walk-in (EN)
/artister/                     ← Artist-grid (DA)
/en/artists/                   ← Artist-grid (EN)
/artister/<slug>/              ← Artist deep-page (DA) × 6
/en/artists/<slug>/            ← Artist deep-page (EN) × 6
/privatlivspolitik/            ← Privacy (DA)
/en/privacy/                   ← Privacy (EN)
/404.html                      ← 404
```

11 unikke ruter, 23 sider.

---

## Cross-page konsistens — komponenter der findes på alle sider

### 1. `<header class="topbar">` — øverst på alle sider

**Implementation:** `src/_includes/partials/topbar.njk`

Hver side har en topbar med 3 zones:

| Side | Venstre | Center | Højre |
|---|---|---|---|
| `/` | ★ ESTD · KBH ★ | VOL.01 / ISSUE.01 / 05.2026 | ● ÅBENT SIDEN '96 |
| `/walk-in/` | ← INK & ART | WALK-IN | ● LIVE |
| `/artister/` | ← INK & ART | ARTISTER | ★ 6 I STOLEN |
| `/artister/<slug>/` | ← ARTISTER | <ARTIST NAVN> | ★ <STIL-TAGS> |
| `/privatlivspolitik/` | ← INK & ART | PRIVATLIVSPOLITIK | ● SENEST OPDATERET YYYY-MM-DD |
| `/404.html` | ← INK & ART | 404 NOT FOUND | ● BAD URL |

**Designvalg:**
- Sub-sider har en **back-link** i venstre celle (← BRAND eller ← FORÆLDRE)
  så brugeren altid kan komme videre uden at scrolle
- Center er **route-id** — fortæller hvor man er
- Højre er **kontekst** — issue-nummer på home, status på walk-in, artist-stats
  på artist-page, last-updated på privacy

**Kritisk for tilgængelighed:** Topbar er nu uden for `<main>` (PR #6 fix),
så `<header>`'en får implicit `role="banner"`. Ingen redundant aria-roller.

### 2. Lang-toggle stempel

**Implementation:** `src/_includes/partials/lang-toggle.njk`

Et lille rotereet stempel `[DA ↗]` eller `[EN ↗]` fixed top-right på hero-sider.
Klik → samme content på det andet sprog.

**Implementation-detalje:** Bruger `sisterUrl`-filteret fra `eleventy.config.js`
til at finde det andet sprogs URL. Mappet ser sådan ud:
```
/                          ↔  /en/
/walk-in/                  ↔  /en/walk-in/
/artister/                 ↔  /en/artists/
/artister/simone/          ↔  /en/artists/simone/
/privatlivspolitik/        ↔  /en/privacy/
```

**Hvorfor stempel og ikke en flag-dropdown?** Punk Xerox æstetik. Ingen
flag-emoji som kan misforstås (UK vs US, DK vs SE). Ren ASCII med pil.

### 3. Footer

**Implementation:** `src/_includes/partials/footer.njk`

Konsistent på alle ruter. To rækker:

```
INK & ART ★ CPH | Walk-in · Artister | Instagram · Facebook · WhatsApp | Privatlivspolitik | © 2026 · Larsbjørnsstræde 13
                                  Bygget af bygmedai.dk
```

**Lang-aware:** Alle nav-links peger på korrekt sprog (DA vs EN), tekst
oversættes via `t`-filter.

**Bygmedai-credit** er bevidst småt (10px) og højre-justeret. Ikke desperat
tagged, men diskret synligt.

---

## Hero-stempler som funktionelle entry-points

Et af de stærkeste UX-fixes i Sprint 1: hero-stempler 1 og 2 er nu
**klikbare og linker til sub-sider**, ikke dekoration.

```
[stamp: Walk-ins ok ↗]  → /walk-in/        (eller /en/walk-in/)
[stamp: Vores artister ↗] → /artister/     (eller /en/artists/)
[stamp: Vol.01 · zine 01]  → dekorativt (aria-hidden)
```

**Hvorfor det er smart:**
- Punk Xerox æstetik bevares — det ER stempler, ikke knapper
- Ingen ekstra navigation behøvet på hero
- Stempler føles som "de er her allerede" (de var det i v0.1) — bare nu
  forventeligt at de fører videre
- Hover-effekt: rotation til 0deg + scale 1.05 — føles som om man "trækker
  klistermærket op"

CSS:
```css
.hero__stamp--link {
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.hero__stamp--link:hover { transform: rotate(0deg) scale(1.05); }
```

---

## Walk-in flow (turist-rejse)

```
1. Turist passerer Larsbjørnsstræde 13
   ↓
2. Ser QR-poster i vinduet
   ↓
3. Skanner med iPhone Camera (auto-detect)
   ↓
4. iPhone åbner Safari → https://inkandart.dk/walk-in/?from=window
   ↓
5. Side loader (~1 s LCP):
   - Topbar: ← INK & ART | WALK-IN | ● LIVE
   - Hero: "DU STÅR UDENFOR. GÅ IND." (eller EN-version)
   - Stempler: [ÅBEN NU] [FRA 800 KR] (initial: schedule-based)
   - About-card: blurb + WhatsApp + Ring-knap
   - Lang-toggle: [DA / EN]
   ↓
6. Klient-JS fetcher /api/status (background)
   ↓
7. Hvis status returnerer "open: true, nextSlot: 14:30":
   - Stempel opdateres: [ÅBEN NU · LEDIG 14:30]
   - About-card text opdateres
   - Topbar live-indikator opdateres
   ↓
8. Hvis status fejler eller bare "open: true, nextSlot: null":
   - Server-rendered fallback bevares: "Walk-ins når vi har tid · 13–23"
   - INGEN error-UI
   ↓
9. Bruger trykker [WHATSAPP ↗]:
   - target="_blank" rel="noopener noreferrer"
   - Åbner WhatsApp app eller wa.me-side
   - Sitet er stadig åben i en anden tab — friction lav
```

**Friction-analyse:**

| Step | Friction | Mitigations |
|---|---|---|
| QR scan | Lav | iPhone scanner auto, ingen app behøvet |
| Page load | Lav | LCP < 1.5 s globalt på 4G |
| Sprog | Mellem | Lang-toggle synlig top-right; default DA |
| Status-troværdighed | Mellem | Sandfærdig fallback hvis API fejler |
| WhatsApp vs Ring | Lav | Begge tilgængelige; turist klikker WhatsApp |
| Pris-konfidens | Mellem | "FRA 800 KR · TIME 1500" stempel synligt |

**Hvad turisten IKKE ser** (bevidst):
- Nogen specifik artist availability
- "BOOK NU" som hovedknap (booking-flowet er for kompleks for walk-in-trafik)
- Cookie-banner hvis de allerede har klikket reject/accept (localStorage)

---

## Artist-discovery flow (lokal-besøgende-rejse)

```
1. Bruger lander på /
   ↓
2. Ser hero med "INK & ART COPENHAGEN" + 3 stempler
   ↓
3. Klikker [Vores artister ↗] eller scroller til footer-link
   ↓
4. /artister/ — grid af 6 cards
   - Hver card: portræt + navn + rolle + stil-tags + "SE PORTFOLIO ↗"
   - Hover: rotation til 0 + 12px shadow
   - Cards er let roterede (-0.4° / +0.5° vekslende) for zine-feel
   ↓
5. Klikker på fx Simone's card
   ↓
6. /artister/simone/ — deep-page:
   - Topbar: ← ARTISTER | SIMONE | ★ BLACKWORK · FINELINE
   - Hero: navn + rolle (stor)
   - Body: portræt (venstre) + facts + bio + book-CTA (højre)
   - Hvis portfolio: grid af billeder under
   - Bottom: ← Artister back-link
   ↓
7. Klikker [BOOK HOS SIMONE ↗]:
   - Deep-link: https://inkart.book.dk/?artist=1
   - Åbner Booksys i ny tab (target=_blank)
   - target=_blank rel="noopener noreferrer" — privacy-respekt
```

**Friction-analyse:**

| Step | Friction | Mitigations |
|---|---|---|
| Find artister fra home | Mellem | Stempel + footer-link + topbar nav (i sub-sider) |
| Vælg artist | Lav | Grid med vigtigste info per card |
| Forstå artist | Lav | Bio + facts + portfolio synligt på deep-page |
| Book direkte | Lav | Deep-link til specific artist hvis Booksys understøtter |

**Vi mangler stadig:**
- Filter på `/artister/` (efter stil) — Sprint 2-kandidat
- Hvilke artister er fysisk tilgængelige denne uge — kan kun sjælle ud fra
  Booksys API hvis vi får detaljer

---

## Skip-link + a11y-landmarks

Hver side har:

```html
<body class="paper">
  <a href="#main" class="skip-link">Gå til indhold</a>  ← skip-link
  <div class="grain" aria-hidden="true"></div>
  <header class="topbar">...</header>                    ← banner landmark
  <main id="main" tabindex="-1">                         ← main landmark
    ... content ...
  </main>
  <footer class="footer">...</footer>                    ← contentinfo landmark
</body>
```

- **Skip-link** er top-left, hidden by default, synes når focus
- **Topbar** er uden for `<main>` (PR #6 fix) → implicit `role="banner"`
- **Main** har `id="main"` (skip-link target) + `tabindex="-1"` (focusable)
- **Footer** er top-level → implicit `role="contentinfo"`
- **`<address>`** indeholder fuld adresse på `/` og privacy-page

JSON-LD struktureret data understøtter:
- `TattooParlor` + `BeautySalon` på alle sider (forretnings-data)
- `Person` på artist-deep-pages
- `BreadcrumbList` på `/walk-in/` og `/artister/`

---

## Reduced-motion-respekt

Alle CSS-animations respekterer `prefers-reduced-motion: reduce`:

- `html { scroll-behavior: smooth }` → `auto` ved reduced-motion
- Marquee-scroll → animation: none
- Logo-hover-wobble → kun rotation, ingen scale
- Stamp-stagger-entrance → instant (animation-duration: 0.001ms)

JS-side:
- `walk-in.js` har ingen animationer — kun text mutation
- `cookie-consent.js` har ingen animationer

---

## Print-styling

`style.css` sektion 17: `@media print { ... }`

- Skjul: grain-overlay, marquee, cookie-banner, hero-tape
- Dark cards (.card--ink, .about-card) tvunget hvid bg + sort tekst
- Removes box-shadow + transform fra alle cards
- Brand farver bevares hvor sikkert (rød på paper-bg printer fint)

> **Stadig open:** Stempler har `mix-blend-mode: multiply` der ikke virker i
> print. De printer som flade farve-bokse. Acceptabel — det er aria-hidden.

---

## Hvad UX-rejsen IKKE understøtter (endnu)

| Behov | Hvorfor ikke nu |
|---|---|
| Filter på /artister/ efter stil | Sprint 2 — kræver SPA-state eller URL-params |
| Map af shop på home | Maps-link findes; embed = 3rd-party styling-konflikt |
| Bookings-historik for tilbagevendende kunder | Out-of-scope (kræver auth + db) |
| Push-notifikationer ved nye artister | Out-of-scope (PWA + push-server) |
| Kommentar-system på artist-pages | Out-of-scope (modereringsbyrde) |
| FAQ-side | Sprint 2-kandidat når Steven har samlet hyppige spørgsmål |
| `/journal/` for nyheder | Sprint 2-kandidat — kræver kvartalsvis content-disciplin |
| Search-funktion | Vores 23 sider er ikke store nok til at retfærdiggøre |

---

## Hooks for Claude Design

CSS sektioner 19-22 i `src/_assets/css/style.css` indeholder **minimal viable
styling** for nye komponenter. Klasse-navne følger BEM:

| Komponent | Klasse | Hvor |
|---|---|---|
| Lang-toggle stempel | `.lang-toggle` | Sektion 19 |
| Funktionelle hero-stempler | `.hero__stamp--link` | Sektion 19 |
| Walk-in hero variant | `.hero--walkin` | Sektion 20 |
| Walk-in stempler | `.walk-in__stamps`, `.walk-in__stamp-status`, `.walk-in__stamp-price` | Sektion 20 |
| Walk-in live status text | `.about-card__live` | Sektion 20 |
| Artists index | `.artists-index`, `.artists-index__head`, `.artists-index__title`, `.artists-index__lead`, `.artists-index__grid` | Sektion 21 |
| Artist card | `.artist-card`, `.artist-card__link`, `.artist-card__portrait`, `.artist-card__body`, `.artist-card__name`, `.artist-card__role`, `.artist-card__styles`, `.artist-card__cta` | Sektion 21 |
| Artist deep page | `.artist`, `.artist__head`, `.artist__file`, `.artist__name`, `.artist__role`, `.artist__body`, `.artist__portrait`, `.artist__facts`, `.artist__bio`, `.artist__portfolio`, `.artist__portfolio-title`, `.artist__portfolio-grid`, `.artist__back` | Sektion 22 |

Claude Design kan **polere fritsvævende** ved at overskrive eller tilføje
declarations — eksisterende klasser garanterer markup-kontrakt forbliver
intakt.

**Steven og jeg har bevidst undladt:**
- Animations på artist-card (hover-wobble) — Claude Designs call
- Specifik farve-rytme på artist-deep-page — kan vælge ink/red/paper-card-variant
- Mobile breakpoints på artist-grid (vi har 1 / 2 / 3 cols, men spacings kan
  gøres pænere)
- Typography-fine-tuning på artist__bio
