import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getPublicRoutes } from "./site-routes.mjs";

function injectHead(template, helmet) {
  const title = helmet?.title?.toString() || "<title>Idcibidci</title>";
  const meta = helmet?.meta?.toString() || "";
  const links = helmet?.link?.toString() || "";
  const scripts = helmet?.script?.toString() || "";
  const head = [title, meta, links, scripts].filter(Boolean).join("\n");

  return template.replace(/<title>[\s\S]*?<\/title>/i, head);
}

async function main() {
  const rootDir = process.cwd();
  const distDir = path.join(rootDir, "dist");
  const templatePath = path.join(distDir, "index.html");
  const template = await fs.readFile(templatePath, "utf8");
  const routes = await getPublicRoutes(rootDir);
  const serverBundle = await import(
    pathToFileURL(path.join(rootDir, "dist-ssr", "entry-server.js")).href
  );

  for (const route of routes) {
    const { html, helmet } = serverBundle.render(route);
    const withHead = injectHead(template, helmet).replace(
      '<div id="root"></div>',
      `<div id="root">${html}</div>`,
    );
    const outputPath =
      route === "/"
        ? templatePath
        : path.join(distDir, route.replace(/^\//, ""), "index.html");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, withHead, "utf8");
  }
}

await main();
