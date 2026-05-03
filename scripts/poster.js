/**
 * scripts/poster.js — generate an A4 walk-in QR poster for the shop window.
 *
 * Usage:
 *   npm run poster            # default: /walk-in (DA)
 *   npm run poster -- --en    # /en/walk-in (EN headline + tagline)
 *   npm run poster -- --url=https://inkandart.dk/walk-in?from=window
 *
 * Output: posters/walk-in-{lang}-{date}.pdf
 *
 * Design: Punk Xerox, single A4 portrait, max contrast, prints clean on
 * cheap printers. QR is large + corner-quiet so it scans through window
 * glass at 1m distance.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import fs from "node:fs/promises";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const lang = args.en ? "en" : "da";
const url = args.url ||
  (lang === "en"
    ? "https://inkandart.dk/en/walk-in/?from=window"
    : "https://inkandart.dk/walk-in/?from=window");

// NOTE: Standard PDF fonts (Helvetica) only render WinAnsi (Latin-1).
// Stick to ASCII for poster strings — Punk Xerox stars/middots get printed
// fine inside the QR code itself; the surrounding poster text just needs
// to be readable from 1m through window glass.
const copy = {
  da: {
    headline: "INK & ART",
    sub: "WALK-IN",
    tagline: "Tatovering / piercing / Koebenhavn",
    instruction: "SCAN MED TELEFONEN",
    fineprint: "Larsbjornsstraede 13 / 1454 Koebenhavn K",
  },
  en: {
    headline: "INK & ART",
    sub: "WALK-IN",
    tagline: "Tattoo / piercing / Copenhagen",
    instruction: "SCAN WITH YOUR PHONE",
    fineprint: "Larsbjornsstraede 13 / 1454 Copenhagen / DK",
  },
};

async function main() {
  const c = copy[lang];

  const qrPng = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    scale: 16,
    color: { dark: "#0a0908", light: "#ece6da" },
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 in points (72 dpi)
  const { width: W, height: H } = page.getSize();

  const ink = rgb(10 / 255, 9 / 255, 8 / 255);
  const paper = rgb(236 / 255, 230 / 255, 218 / 255);
  const red = rgb(200 / 255, 48 / 255, 45 / 255);

  // Paper background
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: paper });

  // Top stripe (red)
  page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: red });
  const helv = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helvR = await pdf.embedFont(StandardFonts.Helvetica);

  // Top stripe text
  page.drawText("ESTD / KBH", {
    x: 24,
    y: H - 44,
    size: 14,
    font: helv,
    color: paper,
  });
  page.drawText(`VOL.01 / WINDOW / ${lang.toUpperCase()}`, {
    x: W - 200,
    y: H - 44,
    size: 14,
    font: helvR,
    color: paper,
  });

  // Headline
  const headW = helv.widthOfTextAtSize(c.headline, 96);
  page.drawText(c.headline, {
    x: (W - headW) / 2,
    y: H - 180,
    size: 96,
    font: helv,
    color: ink,
  });

  // Sub-headline
  const subW = helv.widthOfTextAtSize(c.sub, 64);
  page.drawText(c.sub, {
    x: (W - subW) / 2,
    y: H - 250,
    size: 64,
    font: helv,
    color: red,
  });

  // QR — embed the PNG
  const qrImage = await pdf.embedPng(qrPng);
  const qrSize = 320;
  page.drawImage(qrImage, {
    x: (W - qrSize) / 2,
    y: 220,
    width: qrSize,
    height: qrSize,
  });

  // Instruction below QR
  const instW = helv.widthOfTextAtSize(c.instruction, 22);
  page.drawText(c.instruction, {
    x: (W - instW) / 2,
    y: 180,
    size: 22,
    font: helv,
    color: ink,
  });

  // Tagline
  const tagW = helvR.widthOfTextAtSize(c.tagline, 14);
  page.drawText(c.tagline, {
    x: (W - tagW) / 2,
    y: 130,
    size: 14,
    font: helvR,
    color: ink,
  });

  // Fineprint
  const fineW = helvR.widthOfTextAtSize(c.fineprint, 11);
  page.drawText(c.fineprint, {
    x: (W - fineW) / 2,
    y: 90,
    size: 11,
    font: helvR,
    color: ink,
  });

  // Bottom stripe (ink)
  page.drawRectangle({ x: 0, y: 0, width: W, height: 50, color: ink });
  page.drawText("inkandart.dk", {
    x: 24,
    y: 20,
    size: 11,
    font: helvR,
    color: paper,
  });
  const urlShort = url.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  const urlW = helvR.widthOfTextAtSize(urlShort, 11);
  page.drawText(urlShort, {
    x: W - urlW - 24,
    y: 20,
    size: 11,
    font: helvR,
    color: paper,
  });

  const bytes = await pdf.save();
  const dir = path.resolve("posters");
  await fs.mkdir(dir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const out = path.join(dir, `walk-in-${lang}-${date}.pdf`);
  await fs.writeFile(out, bytes);
  console.log(`✓ Wrote ${out} (${(bytes.length / 1024).toFixed(1)} KB)`);
  console.log(`  QR target: ${url}`);
}

main().catch((err) => {
  console.error("Poster generation failed:", err);
  process.exit(1);
});
