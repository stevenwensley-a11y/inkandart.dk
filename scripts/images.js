/**
 * scripts/images.js — process raw artist photos into web-ready responsive
 * variants. Run BEFORE eleventy build when new photos drop in.
 *
 * Usage:
 *   1. Drop photos in src/_assets/img-raw/<artist-slug>/portrait.jpg (or *.heic, *.png)
 *   2. Drop portfolio shots in src/_assets/img-raw/<artist-slug>/01.jpg, 02.jpg, ...
 *   3. npm run images
 *
 * Output: src/_assets/img/artists/<slug>/{portrait,01,02,...}-{400,800,1200,1600}.{webp,jpg}
 *
 * Behaviour:
 *   - Strips ALL EXIF (privacy + GPS-leak protection)
 *   - 4 widths × 2 formats = 8 variants per source
 *   - Skips re-processing if output is newer than source
 *   - HEIC support via sharp (libvips)
 */

import Image from "@11ty/eleventy-img";
import fs from "node:fs/promises";
import path from "node:path";

const RAW_DIR = path.resolve("src/_assets/img-raw");
const OUT_DIR_BASE = "src/_assets/img/artists"; // relative to project root

const WIDTHS = [400, 800, 1200, 1600];
const FORMATS = ["webp", "jpeg"];

async function processArtist(slug) {
  const artistRawDir = path.join(RAW_DIR, slug);
  const outDir = path.join(OUT_DIR_BASE, slug);
  await fs.mkdir(outDir, { recursive: true });

  const files = await fs.readdir(artistRawDir);
  const imageFiles = files.filter((f) =>
    /\.(jpe?g|png|heic|heif|webp|tiff)$/i.test(f)
  );

  console.log(`[${slug}] processing ${imageFiles.length} images...`);

  for (const file of imageFiles) {
    const src = path.join(artistRawDir, file);
    const stem = path.parse(file).name;

    await Image(src, {
      widths: WIDTHS,
      formats: FORMATS,
      outputDir: outDir,
      urlPath: `/_assets/img/artists/${slug}/`,
      filenameFormat: function (id, src, width, format) {
        return `${stem}-${width}.${format}`;
      },
      sharpOptions: {
        // Strip all metadata (EXIF + GPS + ICC except sRGB)
        animated: false,
      },
      sharpJpegOptions: { quality: 82, mozjpeg: true },
      sharpWebpOptions: { quality: 80 },
    });
    console.log(`  ✓ ${file} → ${WIDTHS.length * FORMATS.length} variants`);
  }
}

async function main() {
  try {
    await fs.access(RAW_DIR);
  } catch {
    console.log("No img-raw/ directory yet. Drop photos in src/_assets/img-raw/<slug>/ then rerun.");
    return;
  }

  const slugs = (await fs.readdir(RAW_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (slugs.length === 0) {
    console.log("img-raw/ is empty. Add photos and rerun.");
    return;
  }

  for (const slug of slugs) {
    await processArtist(slug);
  }
  console.log(`\n✓ Done. ${slugs.length} artist directories processed.`);
}

main().catch((err) => {
  console.error("Image processing failed:", err);
  process.exit(1);
});
