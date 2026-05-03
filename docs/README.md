# inkandart.dk — dokumentation

Velkommen. Dette er den tekniske dokumentation for inkandart.dk-sitet,
opdateret pr. **Sprint 1 (v0.2.0)** — efter merge af PR #17.

> **Læser-aim:** Steven (operatør), Claude Design (frontend-polish), Haruki
> (BygMedAI sous-chef), eller en fremtidig collaborator der overtager projektet
> uden kontekst. Dokumentationen er skrevet til at kunne læses kold.

---

## Hvad er sitet?

Static landing site for **Ink & Art Copenhagen** — tatovør- og piercingstudio
på Larsbjørnsstræde 13 i hjertet af København. Bygget gratis som
showcase-arbejde for [BygMedAI](https://www.bygmedai.dk).

- **Live:** https://inkandart.dk
- **Stack:** Eleventy 3 (static site generator) + Vercel (hosting + Edge
  Functions) + self-hosted assets
- **Content-pipeline:** Steven redigerer markdown/JSON i repo, Vercel auto-deployer
- **Æstetik:** "Punk Xerox" — paper bg, riso-grain, oxblood-rød accent,
  Bebas Neue + Space Mono. Designet til at holde i 18+ måneder.

---

## Sprint 1 — hvad landede

Per Stevens feature-aftale leverer Sprint 1 to af de tre features (Wall of
names blev eksplicit skippet pga. GDPR-consent-risk og lav vedligeholdelses-værdi):

| Feature | Status | Doc |
|---|---|---|
| `/walk-in` rute med truthful status-strip | ✅ Live | [api-status.md](api-status.md) |
| `/artister` index + 6 artist-deep-pages | ✅ Live (med stub-content) | [content-workflow.md](runbook.md#tilføj-en-ny-artist) |
| Wall of names | ❌ Skippet | [architecture.md](architecture.md#hvad-vi-eksplicit-ikke-byggede) |
| Fuld DA + EN i18n | ✅ Live | [architecture.md](architecture.md#i18n-strategi) |
| Mock Booksys API + Edge Function | ✅ Live | [api-status.md](api-status.md) |
| QR-poster generator | ✅ `npm run poster` | [runbook.md](runbook.md#generér-vindues-poster) |
| Image pipeline | ✅ `npm run images` | [runbook.md](runbook.md#bearbejd-nye-billeder) |
| Lighthouse CI | ✅ GitHub Action | [architecture.md](architecture.md#cicd) |
| Cron-rebuild | ✅ GitHub Action (mandag 03:00 UTC) | [architecture.md](architecture.md#cicd) |

Total: 23 sider på 11 unikke ruter. 0 third-party requests fra forsiden.
Build < 0.3 s. Validate-clean.

---

## Doc-index

| Doc | Læs hvis du skal... |
|---|---|
| [architecture.md](architecture.md) | Forstå stack, i18n, routing, data-model, hvilke beslutninger vi tog og hvorfor |
| [runbook.md](runbook.md) | Tilføje en artist, processere billeder, generere poster, deploye, rulle tilbage |
| [api-status.md](api-status.md) | Forstå `/api/status`, swappe mock til real Booksys, debugge edge-cache |
| [ux-journey.md](ux-journey.md) | Forstå tværgående UX-mønstre — topbar, lang-toggle, hero-stempler, friction-reducere |

---

## Quick-start for nye collaboratorer

```bash
# 1. Klon + installér
git clone git@github.com:stevenwensley-a11y/inkandart.dk.git
cd inkandart.dk
nvm use            # Node 20
npm install

# 2. Lokal preview
npm run serve      # http://localhost:8080

# 3. Build + validate
npm run build      # output → _site/
npm run validate   # html-validate (skal være 0 fejl)

# 4. Genér QR-poster (efter behov)
npm run poster

# 5. Bearbejd nye billeder (efter behov)
npm run images     # tager fra src/_assets/img-raw/<slug>/
```

---

## Sprint 2 — kandidater

Ikke prioriteret. Steven beslutter når Sprint 1 er stabil + content er på plads.

- **Real Booksys integration** (~20 linjers swap i `api/_lib/booksys-mock.js`)
- **R2 image migration** — Cloudflare R2 til portfolio-billeder for fri egress når
  trafikken vokser
- **`@vercel/og` runtime OG-images** — per-artist branded social-share previews
- **`/walk-in?from=window` toast** — "★ DU SKANNEDE OS ★"-stempel der dukker op
  3s når URL har query-param
- **Cookie-banner re-evaluering** — vi loader 0 tracking; Datatilsynet kræver
  ikke consent for vores localStorage-flag. Drop banner = mindre friction
- **Schema.org review-aggregation** — pull Google reviews via Places API til
  zettel-cards
- **Lighthouse CI: tilføj mobile-preset** ud over desktop
- **Auto-bump SENEST OPDATERET** dato på privatlivspolitik via git-log eller
  page front matter

---

## Kontakt

| Hvem | Rolle |
|---|---|
| Steven Wensley | Owner, content-pipeline, code-reviewer | steven@bygmedai.dk |
| Simone | Klient, shop-ejer, content-leverance | telefon (+45 55 24 86 08) |
| Haruki | BygMedAI sous-chef, strategisk review | (Haruki) |
| Vilde Claude | AI-collaborator, kode + arkitektur | (denne dokumentation) |
