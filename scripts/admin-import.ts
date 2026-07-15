import crypto from "node:crypto";

import { ensureAdminSeeded } from "../api/_lib/admin-crm";
import {
  closeLocalDatabase,
  migrateConfiguredDatabase,
  withDatabase,
  type DatabaseSession,
} from "../api/_lib/database";
import {
  listLegacySubmissions,
  readLegacyCopyOverrides,
  type LegacySubmission,
} from "../api/_lib/legacy-storage";

const apply = process.argv.includes("--apply");

async function main() {
  await migrateConfiguredDatabase();
  await ensureAdminSeeded();
  const [submissions, overrides] = await Promise.all([
    listLegacySubmissions(1000),
    readLegacyCopyOverrides(),
  ]);
  const sourceChecksum = checksum(
    submissions
      .map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        status: item.status,
      }))
      .sort(byId),
  );
  const existing = await withDatabase((database) =>
    database.query<{ legacy_id: string }>(
      `SELECT legacy_id FROM leads WHERE legacy_id IS NOT NULL`,
    ),
  );
  const existingIds = new Set(existing.map((row) => row.legacy_id));
  const pending = submissions.filter(
    (submission) => !existingIds.has(submission.id),
  );
  const photoOverrides = Object.entries(overrides).filter(
    ([key, value]) => key.startsWith("photo.") && /^https?:\/\//.test(value),
  );

  console.log(`${apply ? "APPLY" : "DRY RUN"}: legacy admin migration`);
  console.log(
    `Submissions: ${submissions.length} source, ${existingIds.size} already imported, ${pending.length} pending`,
  );
  console.log(
    `Copy/photo overrides: ${Object.keys(overrides).length} total, ${photoOverrides.length} media references`,
  );
  console.log(`Source checksum: ${sourceChecksum}`);

  if (!apply) {
    console.log(
      "No data changed. Re-run with --apply after reviewing these counts.",
    );
    return;
  }

  let imported = 0;
  await withDatabase(
    async (database) => {
      const stages = await database.query<{
        id: string;
        name: string;
        category: string;
      }>(`SELECT id, name, category FROM pipeline_stages`);
      for (const submission of pending) {
        await importSubmission(database, submission, stages);
        imported += 1;
      }
      for (const [key, value] of Object.entries(overrides)) {
        await importCopyOverride(database, key, value);
      }
      for (const [key, url] of photoOverrides) {
        await importMediaReference(database, key, url);
      }
    },
    { transaction: true },
  );

  const reconciled = await withDatabase((database) =>
    database.query<{
      legacy_id: string;
      created_at: Date | string;
      stage: string;
    }>(
      `SELECT l.legacy_id, l.created_at, CASE WHEN s.category = 'archived' THEN 'archived' WHEN lower(s.name) = 'in progress' THEN 'contacted' ELSE 'new' END AS stage
     FROM leads l JOIN pipeline_stages s ON s.id = l.stage_id WHERE l.legacy_id IS NOT NULL ORDER BY l.legacy_id`,
    ),
  );
  const importedChecksum = checksum(
    reconciled
      .map((row) => ({
        id: row.legacy_id,
        createdAt: new Date(row.created_at).toISOString(),
        status: row.stage,
      }))
      .sort(byId),
  );
  console.log(`Imported this run: ${imported}`);
  console.log(`Reconciled legacy leads: ${reconciled.length}`);
  console.log(`Imported checksum: ${importedChecksum}`);
  if (
    reconciled.length !== submissions.length ||
    importedChecksum !== sourceChecksum
  ) {
    throw new Error(
      "Reconciliation failed: source and imported counts/checksums do not match.",
    );
  }
  console.log(
    "Migration reconciled successfully. Legacy storage was not modified.",
  );
}

async function importSubmission(
  database: DatabaseSession,
  submission: LegacySubmission,
  stages: Array<{ id: string; name: string; category: string }>,
) {
  const agency =
    text(submission.fields?.["Agency / company"]) ||
    text(submission.summary).split(" — ")[0] ||
    "Unknown organization";
  const contactName =
    text(submission.contact?.name) ||
    text(submission.fields?.["Contact name"]) ||
    "Unknown contact";
  const email =
    text(submission.contact?.email) ||
    text(submission.fields?.["Work email"]) ||
    `legacy-${submission.id}@invalid.local`;
  const country =
    text(submission.contact?.country) ||
    text(submission.fields?.["Country / market"]) ||
    null;
  const organization = await database.query<{ id: string }>(
    `INSERT INTO organizations (name, normalized_name, country, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (normalized_name) DO UPDATE SET country = COALESCE(organizations.country, EXCLUDED.country)
     RETURNING id`,
    [agency, normalize(agency), country, submission.createdAt],
  );
  const contact = await database.query<{ id: string }>(
    `INSERT INTO contacts (organization_id, name, email, normalized_email, phone, country, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     ON CONFLICT (normalized_email) DO UPDATE SET
       name = CASE WHEN contacts.name = '' THEN EXCLUDED.name ELSE contacts.name END,
       phone = COALESCE(contacts.phone, EXCLUDED.phone), country = COALESCE(contacts.country, EXCLUDED.country)
     RETURNING id`,
    [
      organization[0]!.id,
      contactName,
      email,
      normalize(email),
      text(submission.contact?.phone) || null,
      country,
      submission.createdAt,
    ],
  );
  const stage =
    submission.status === "archived"
      ? stages.find((item) => item.category === "archived")
      : submission.status === "contacted"
        ? stages.find((item) => item.name.toLowerCase() === "in progress")
        : stages.find((item) => item.name.toLowerCase() === "new");
  if (!stage)
    throw new Error(
      `No pipeline stage available for legacy status ${submission.status}.`,
    );
  const duplicate = await database.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM leads WHERE contact_id = $1 OR organization_id = $2) AS exists`,
    [contact[0]!.id, organization[0]!.id],
  );
  const sanitizedPayload = structuredClone(submission) as Record<
    string,
    unknown
  >;
  if (sanitizedPayload.meta && typeof sanitizedPayload.meta === "object")
    delete (sanitizedPayload.meta as Record<string, unknown>).ipAddress;
  const leadId = crypto.randomUUID();
  const message = text(submission.fields?.Message) || text(submission.summary);
  await database.query(
    `INSERT INTO leads
      (id, legacy_id, organization_id, contact_id, stage_id, title, summary, message,
       source, source_page, form_type, package_code, travel_dates, pax, travel_type,
       duplicate, consent_version, custom_fields, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'legacy-website', $9, $10, $11, $12, $13, $14, $15, 'legacy', $16::jsonb, $17, $17)`,
    [
      leadId,
      submission.id,
      organization[0]!.id,
      contact[0]!.id,
      stage.id,
      text(submission.summary) || `${agency} — Legacy inquiry`,
      message.slice(0, 240),
      message,
      text(submission.sourcePage),
      text(submission.formType) || "inquiry",
      emptyToNull(submission.fields?.["Package of interest"]),
      emptyToNull(submission.fields?.["Preferred travel dates"]),
      emptyToNull(submission.fields?.["Group size (pax)"]),
      emptyToNull(submission.fields?.["Type of travel"]),
      duplicate[0]?.exists || false,
      JSON.stringify({ legacyPayload: sanitizedPayload }),
      submission.createdAt,
    ],
  );
  await database.query(
    `INSERT INTO lead_events (lead_id, type, body, metadata, created_at)
     VALUES ($1, 'lead.imported', $2, $3::jsonb, $4)`,
    [
      leadId,
      `Imported from the legacy ${submission.formType || "inquiry"} inbox.`,
      JSON.stringify({
        legacyId: submission.id,
        legacyStatus: submission.status,
      }),
      submission.createdAt,
    ],
  );
  if (submission.status !== "new") {
    await database.query(
      `INSERT INTO lead_events (lead_id, type, body, metadata, created_at)
       VALUES ($1, 'legacy.status', $2, $3::jsonb, $4)`,
      [
        leadId,
        `Legacy status: ${submission.status}.`,
        JSON.stringify({ status: submission.status }),
        submission.createdAt,
      ],
    );
  } else {
    await database.query(
      `INSERT INTO tasks (lead_id, title, notes, due_at, created_at, updated_at)
       VALUES ($1, 'Review imported inquiry', 'Confirm whether this legacy lead still needs follow-up.', $2, now(), now())`,
      [leadId, nextBusinessDay(new Date())],
    );
  }
}

async function importCopyOverride(
  database: DatabaseSession,
  key: string,
  value: string,
) {
  const entryKey = `copy:${key}`;
  const existing = await database.query<{ id: string }>(
    `SELECT id FROM content_entries WHERE key = $1`,
    [entryKey],
  );
  if (existing[0]) return;
  const entryId = crypto.randomUUID();
  const revisionId = crypto.randomUUID();
  await database.query(
    `INSERT INTO content_entries (id, key, kind, title, draft_revision_id, published_revision_id)
     VALUES ($1, $2, 'copy', $3, $4, $4)`,
    [entryId, entryKey, key.replace(/[._-]+/g, " "), revisionId],
  );
  await database.query(
    `INSERT INTO content_revisions (id, entry_id, version, data, note)
     VALUES ($1, $2, 1, $3::jsonb, 'Imported from legacy copy overrides')`,
    [revisionId, entryId, JSON.stringify({ value })],
  );
}

async function importMediaReference(
  database: DatabaseSession,
  key: string,
  url: string,
) {
  const pathname = (() => {
    try {
      return new URL(url).pathname.replace(/^\/+/, "");
    } catch {
      return `legacy/${crypto.randomUUID()}`;
    }
  })();
  const filename = pathname.split("/").pop() || key;
  await database.query(
    `INSERT INTO media_assets (pathname, url, filename, mime_type, bytes, alt, status, variants)
     VALUES ($1, $2, $3, $4, 0, $5, 'ready', '{}'::jsonb)
     ON CONFLICT (pathname) DO NOTHING`,
    [
      pathname,
      url,
      filename,
      mimeFor(filename),
      key.slice(6).replace(/[._-]+/g, " "),
    ],
  );
}

function checksum(value: unknown) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}
function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
function text(value: unknown) {
  const result = String(value ?? "").trim();
  return result === "—" ? "" : result;
}
function emptyToNull(value: unknown) {
  return text(value) || null;
}
function byId(left: { id: string }, right: { id: string }) {
  return left.id.localeCompare(right.id);
}
function nextBusinessDay(from: Date) {
  const result = new Date(from);
  do {
    result.setDate(result.getDate() + 1);
  } while (result.getDay() === 0 || result.getDay() === 6);
  result.setHours(10, 0, 0, 0);
  return result.toISOString();
}
function mimeFor(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension === "png"
    ? "image/png"
    : extension === "webp"
      ? "image/webp"
      : extension === "avif"
        ? "image/avif"
        : "image/jpeg";
}

main()
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeLocalDatabase());
