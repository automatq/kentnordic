import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import type { ContentKind } from "../shared/admin-contracts";
import { validateContent } from "../api/_lib/admin-content";
import {
  closeLocalDatabase,
  migrateConfiguredDatabase,
  withDatabase,
  type DatabaseSession,
} from "../api/_lib/database";
import { ensureAdminSeeded } from "../api/_lib/admin-crm";

interface SeedEntry {
  key: string;
  kind: ContentKind;
  title: string;
  route: string | null;
  data: Record<string, unknown>;
}

async function main() {
  await migrateConfiguredDatabase();
  await ensureAdminSeeded();
  const entries = await readContentEntries();
  let inserted = 0;
  await withDatabase(
    async (database) => {
      for (const entry of entries) {
        if (await upsertInitialEntry(database, entry)) inserted += 1;
      }
    },
    { transaction: true },
  );
  console.log(
    `Content seed complete: ${inserted} inserted, ${entries.length - inserted} already present.`,
  );
  await closeLocalDatabase();
}

export async function upsertInitialEntry(
  database: DatabaseSession,
  entry: SeedEntry,
) {
  const existing = await database.query<{ id: string }>(
    `SELECT id FROM content_entries WHERE key = $1`,
    [entry.key],
  );
  if (existing[0]) return false;
  const entryId = crypto.randomUUID();
  const revisionId = crypto.randomUUID();
  const errors = validateContent(entry.data);
  await database.query(
    `INSERT INTO content_entries
      (id, key, kind, title, route, draft_revision_id, published_revision_id)
     VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [entryId, entry.key, entry.kind, entry.title, entry.route, revisionId],
  );
  await database.query(
    `INSERT INTO content_revisions
      (id, entry_id, version, data, validation_errors, note)
     VALUES ($1, $2, 1, $3::jsonb, $4::jsonb, 'Seeded from repository content')`,
    [revisionId, entryId, JSON.stringify(entry.data), JSON.stringify(errors)],
  );
  return true;
}

async function readContentEntries(): Promise<SeedEntry[]> {
  const root = path.resolve(process.cwd(), "src/content");
  const entries: SeedEntry[] = [];

  for (const filename of await files(path.join(root, "tours"), ".md")) {
    const parsed = parseMarkdown(await fs.readFile(filename, "utf8"));
    const id = basename(filename);
    entries.push({
      key: `tour:${id}`,
      kind: "tour",
      title: String(parsed.data.name || id),
      route: `/tours/${id}`,
      data: { data: parsed.data, body: parsed.body },
    });
  }
  for (const filename of await files(path.join(root, "services"), ".md")) {
    const parsed = parseMarkdown(await fs.readFile(filename, "utf8"));
    const id = basename(filename);
    entries.push({
      key: `service:${id}`,
      kind: "service",
      title: String(parsed.data.name || id),
      route: "/services",
      data: { data: parsed.data, body: parsed.body },
    });
  }
  for (const filename of await files(path.join(root, "legal"), ".md")) {
    const parsed = parseMarkdown(await fs.readFile(filename, "utf8"));
    const id = basename(filename);
    entries.push({
      key: `legal:${id}`,
      kind: "legal",
      title: String(parsed.data.title || id),
      route: `/${id}`,
      data: { data: parsed.data, body: parsed.body },
    });
  }
  for (const filename of await files(path.join(root, "regions"), ".json")) {
    const id = basename(filename);
    const data = JSON.parse(await fs.readFile(filename, "utf8")) as Record<
      string,
      unknown
    >;
    entries.push({
      key: `region:${id}`,
      kind: "region",
      title: String(data.name || id),
      route: "/destinations",
      data,
    });
  }

  await addJsonCollection(
    entries,
    path.join(root, "destinations/destinations.json"),
    "destination",
    "/destinations",
  );
  await addJsonCollection(
    entries,
    path.join(root, "faq/faq.json"),
    "faq",
    null,
  );
  await addJsonCollection(
    entries,
    path.join(root, "testimonials/testimonials.json"),
    "testimonial",
    null,
  );
  await addJsonCollection(
    entries,
    path.join(root, "offices/offices.json"),
    "office",
    "/contact",
  );

  entries.push({
    key: "site:settings",
    kind: "site",
    title: "Site settings",
    route: null,
    data: {
      brandName: "Idcibidci",
      tagline: "Your ground partner in Iceland",
      inquiryEmail: process.env.PUBLIC_INQUIRY_EMAIL || "sales@idcibidci.is",
      seo: {
        defaultTitle: "Idcibidci · Iceland Destination Management Company",
      },
    },
  });

  return entries;
}

async function addJsonCollection(
  entries: SeedEntry[],
  filename: string,
  kind: "destination" | "faq" | "testimonial" | "office",
  route: string | null,
) {
  const items = JSON.parse(await fs.readFile(filename, "utf8")) as Array<
    Record<string, unknown>
  >;
  for (const [index, data] of items.entries()) {
    const id = String(data.id || `item-${index + 1}`);
    entries.push({
      key: `${kind}:${id}`,
      kind,
      title: String(data.name || data.question || data.author || id),
      route,
      data,
    });
  }
}

function parseMarkdown(raw: string) {
  if (!raw.startsWith("---"))
    return { data: {} as Record<string, unknown>, body: raw.trim() };
  const end = raw.indexOf("\n---", 3);
  if (end === -1)
    return { data: {} as Record<string, unknown>, body: raw.trim() };
  return {
    data: (YAML.parse(raw.slice(3, end).trim()) || {}) as Record<
      string,
      unknown
    >,
    body: raw
      .slice(end + 4)
      .trimStart()
      .trim(),
  };
}

async function files(directory: string, extension: string) {
  return (await fs.readdir(directory))
    .filter((name) => name.endsWith(extension))
    .sort()
    .map((name) => path.join(directory, name));
}

function basename(filename: string) {
  return path.basename(filename).replace(/\.(md|json)$/, "");
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await closeLocalDatabase();
  process.exitCode = 1;
});
