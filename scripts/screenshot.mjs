/**
 * Visual QA helper. Screenshots a set of routes at desktop + mobile widths.
 *   node scripts/screenshot.mjs [baseUrl] [route1 route2 ...]
 * Defaults to http://localhost:5173 and a standard route set.
 * Requires a running Vite dev/preview server and Playwright chromium.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.context', 'screenshots');
const args = process.argv.slice(2);
const base = (args[0] && args[0].startsWith('http') ? args.shift() : 'http://localhost:5173').replace(/\/$/, '');
const routes = args.length
  ? args
  : ['/', '/tours', '/tours/std02s4', '/destinations', '/services', '/about', '/contact'];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

function slug(route) {
  return route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-');
}

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  for (const route of routes) {
    const url = base + route;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(400);
      const file = join(OUT, `${slug(route)}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`✓ ${url} -> ${file}`);
    } catch (e) {
      console.error(`✗ ${url}: ${e.message}`);
    }
  }
  await ctx.close();
}

await browser.close();
console.log('Done.');
