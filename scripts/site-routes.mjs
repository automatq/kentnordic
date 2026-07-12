import fs from "node:fs/promises";
import path from "node:path";

export const STATIC_PUBLIC_ROUTES = [
  "/",
  "/about",
  "/services",
  "/destinations",
  "/tours",
  "/contact",
  "/privacy",
  "/trade-terms",
];

function slugFromFilename(filename) {
  return filename.replace(/\.(md|mdx)$/i, "");
}

export async function getTourRoutes(rootDir = process.cwd()) {
  const toursDir = path.join(rootDir, "src", "content", "tours");
  const entries = await fs.readdir(toursDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(md|mdx)$/i.test(entry.name))
    .map((entry) => `/tours/${slugFromFilename(entry.name)}`)
    .sort();
}

export async function getPublicRoutes(rootDir = process.cwd()) {
  return [...STATIC_PUBLIC_ROUTES, ...(await getTourRoutes(rootDir))];
}
