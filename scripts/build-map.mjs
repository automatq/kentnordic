/**
 * Turns the provided Iceland map artwork (Illustrator/PDF, pure vector) into:
 *   1. src/data/map-base.svg     — the optimized full artwork (decorative base layer)
 *   2. src/data/map-regions.json — exact geometry of the 8 colour-coded regions,
 *      used as an interactive/accessible overlay in IcelandMap.tsx.
 *
 * Pipeline:
 *   .ai (PDF) --pdftocairo--> raw SVG --this script--> base.svg + regions.json
 *
 * Re-run:  node scripts/build-map.mjs
 * (expects the raw SVG at /tmp/iceland-raw.svg — produced by:
 *   cp "<.ai file>" /tmp/iceland_map.pdf && pdftocairo -svg /tmp/iceland_map.pdf /tmp/iceland-raw.svg )
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { optimize } from 'svgo';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = '/tmp/iceland-raw.svg';
const OUT_DIR = join(ROOT, 'src', 'data');

// Exact fill colours emitted by pdftocairo for each region (from inspection).
const REGION_COLORS = {
  'rgb(100%, 59.999084%, 59.999084%)': 'reykjavik',
  'rgb(99.198914%, 86.698914%, 64.299011%)': 'golden-circle',
  'rgb(62.69989%, 81.599426%, 62.69989%)': 'south-coast',
  'rgb(100%, 69.398499%, 97.999573%)': 'jokulsarlon',
  'rgb(93.299866%, 72.499084%, 60.798645%)': 'akureyri',
  'rgb(67.799377%, 87.098694%, 80.799866%)': 'myvatn',
  'rgb(67.498779%, 71.398926%, 77.999878%)': 'eastfjords',
  'rgb(79.598999%, 76.499939%, 86.299133%)': 'snaefellsnes',
};

function bboxOf(d) {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i], y = nums[i + 1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

async function run() {
  const raw = await readFile(RAW, 'utf8');

  // --- 1. Extract region geometry (before optimization, so colours are intact) ---
  const pathRe = /<path\b[^>]*\bfill="([^"]+)"[^>]*\bd="([^"]+)"[^>]*\/?>/g;
  const regionPaths = {};
  let m;
  while ((m = pathRe.exec(raw)) !== null) {
    const fill = m[1];
    const d = m[2];
    const slug = REGION_COLORS[fill];
    if (!slug) continue;
    const bb = bboxOf(d);
    // Skip tiny legend swatches (small boxes clustered bottom-right).
    const isLegend = bb.minX > 2450 && bb.minY > 1700 && bb.w < 120 && bb.h < 120;
    const tooSmall = bb.w < 40 && bb.h < 40;
    if (isLegend || tooSmall) continue;
    (regionPaths[slug] ??= []).push(d);
  }

  const missing = Object.values(REGION_COLORS).filter((s) => !regionPaths[s]);
  if (missing.length) {
    console.warn('⚠ regions with no geometry captured:', missing.join(', '));
  }

  const regions = Object.values(REGION_COLORS)
    .filter((slug, i, arr) => arr.indexOf(slug) === i)
    .filter((slug) => regionPaths[slug])
    .map((slug) => ({ slug, d: regionPaths[slug].join(' ') }));

  // --- 2. Optimize the full artwork for the decorative base layer ---
  const optimized = optimize(raw, {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
            // keep shapes faithful
            mergePaths: false,
            convertShapeToPath: false,
            removeHiddenElems: false,
          },
        },
      },
      { name: 'removeDimensions' },
    ],
  }).data;

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, 'map-base.svg'), optimized, 'utf8');
  await writeFile(
    join(OUT_DIR, 'map-regions.json'),
    JSON.stringify({ viewBox: '0 0 3000 2100', regions }, null, 2),
    'utf8',
  );

  console.log(`Base SVG: ${(optimized.length / 1024).toFixed(0)} KB`);
  console.log(`Regions captured: ${regions.map((r) => `${r.slug}(${r.d.length}c)`).join(', ')}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
