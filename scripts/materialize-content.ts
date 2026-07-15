import fs from "node:fs/promises";
import path from "node:path";

import { closeLocalDatabase, withDatabase } from "../api/_lib/database";

interface EntryRow extends Record<string, unknown> {
  key: string;
  kind: string;
  data: Record<string, unknown>;
}

async function main() {
  const outputDir = path.resolve(process.cwd(), ".context");
  await fs.mkdir(outputDir, { recursive: true });

  let releaseId: string | null = null;
  let releaseNumber: number | null = null;
  let rows: EntryRow[] = [];

  try {
    const release = await withDatabase((database) =>
      database.query<{ id: string; number: number }>(
        `SELECT id, number FROM content_releases
         WHERE status IN ('deploying', 'live')
         ORDER BY CASE WHEN status = 'deploying' THEN 0 ELSE 1 END, number DESC
         LIMIT 1`,
      ),
    );
    if (release[0]) {
      releaseId = release[0].id;
      releaseNumber = release[0].number;
      rows = await withDatabase((database) =>
        database.query<EntryRow>(
          `SELECT e.key, e.kind, r.data
           FROM content_release_entries re
           JOIN content_entries e ON e.id = re.entry_id
           JOIN content_revisions r ON r.id = re.revision_id
           WHERE re.release_id = $1`,
          [releaseId],
        ),
      );
    } else {
      rows = await withDatabase((database) =>
        database.query<EntryRow>(
          `SELECT e.key, e.kind, r.data
           FROM content_entries e
           JOIN content_revisions r ON r.id = e.published_revision_id
           WHERE e.deleted_at IS NULL`,
        ),
      );
    }
  } catch (error) {
    if (process.env.DATABASE_URL) throw error;
    console.warn(
      "No local admin content snapshot found; using repository content.",
    );
  } finally {
    await closeLocalDatabase();
  }

  const entries = Object.fromEntries(
    rows.map((row) => [row.key, { kind: row.kind, data: row.data }]),
  );
  const moduleSource = `export default ${JSON.stringify({ releaseId, releaseNumber, entries }, null, 2)} as const;\n`;
  await fs.writeFile(
    path.join(outputDir, "generated-content-release.ts"),
    moduleSource,
    "utf8",
  );
  await fs.writeFile(
    path.join(outputDir, "content-version.json"),
    JSON.stringify(
      {
        releaseId,
        releaseNumber,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    `Materialized ${rows.length} content entries${releaseId ? ` from release ${releaseNumber}` : ""}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
