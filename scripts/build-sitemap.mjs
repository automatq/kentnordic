import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getPublicRoutes } from "./site-routes.mjs";

async function main() {
  const rootDir = process.cwd();
  const distDir = path.join(rootDir, "dist");
  const routes = await getPublicRoutes(rootDir);
  const serverBundle = await import(
    pathToFileURL(path.join(rootDir, "dist-ssr", "entry-server.js")).href
  );
  const siteUrl = serverBundle.siteUrl;
  const urls = routes
    .map((route) => `  <url><loc>${new URL(route, siteUrl).href}</loc></url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  await fs.writeFile(path.join(distDir, "sitemap.xml"), xml, "utf8");
}

await main();
