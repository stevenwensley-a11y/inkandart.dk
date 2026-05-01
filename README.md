# inkandart.dk

Landing page for **Ink & Art Copenhagen** — tatovør- og piercingstudio på Larsbjørnsstræde 13, København K.

**Live:** https://inkandart.dk

## Stack

- [Eleventy](https://www.11ty.dev/) v3 (static site generator)
- Plain CSS + vanilla JS (no build pipeline beyond Eleventy)
- [Vercel](https://vercel.com/) (hosting + auto-deploy from `main`)
- [Simply.com](https://simply.com/) (DNS + email forwarding)

## Quickstart (local)

```bash
nvm use            # Node 20
npm install
npm run serve      # http://localhost:8080
npm run build      # output → _site/
npm run validate   # html-validate
```

## Single source of truth: `src/_data/site.json`

All site content (name, contact, hours, links) lives in one JSON file. To update:

1. Edit `src/_data/site.json` directly on GitHub (web UI: pencil icon)
2. Commit
3. Vercel auto-rebuilds within ~60s

## Deploy

`main` is the deploy branch. Pushing to `main` triggers Vercel deploy.

## TODOs from Simone (v0.2 inputs)

- [ ] Confirm opening hours (currently from FB, ~3 years stale)
- [ ] 3-5 photos of tattoo work, atmosphere, or artists
- [ ] Logo in original SVG/high-res PNG (currently using a JPG conversion)
- [ ] Confirm phone `55 24 86 08` and email `kontakt@inkandart.dk`
- [ ] Update Instagram bio to point at `inkandart.dk` (currently points at `inknart.dk` — different shop)

## v0.2 backlog

Portfolio, artist profiles, walk-in info, FAQ, contact form, EN-version, self-host fonts, GA4.

## Owner

Steven Wensley · steven@bygmedai.dk
