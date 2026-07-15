import crypto from "node:crypto";

import type {
  AdminProfile,
  ContentEntry,
  ContentKind,
  ContentRelease,
} from "../../shared/admin-contracts.js";
import { audit } from "./admin-auth.js";
import { withDatabase, type DatabaseSession } from "./database.js";
import { HttpError } from "./http.js";

interface ContentRow extends Record<string, unknown> {
  id: string;
  key: string;
  kind: ContentKind;
  title: string;
  route: string | null;
  draft_revision_id: string | null;
  published_revision_id: string | null;
  draft_version: number | null;
  draft_data: Record<string, unknown> | null;
  draft_errors: string[] | null;
  published_version: number | null;
  published_data: Record<string, unknown> | null;
  updated_at: Date | string;
  published_at: Date | string | null;
}

interface ReleaseRow extends Record<string, unknown> {
  id: string;
  number: number;
  status: ContentRelease["status"];
  profile_id: string;
  note: string;
  deploy_job_id: string | null;
  failure_reason: string | null;
  created_at: Date | string;
  live_at: Date | string | null;
}

export async function listContentEntries(
  options: {
    kind?: string;
    query?: string;
    changedOnly?: boolean;
  } = {},
) {
  const params: unknown[] = [];
  const where = ["e.deleted_at IS NULL"];
  if (options.kind) {
    params.push(options.kind);
    where.push(`e.kind = $${params.length}::content_kind`);
  }
  if (options.query?.trim()) {
    params.push(`%${options.query.trim()}%`);
    where.push(
      `(e.title ILIKE $${params.length} OR e.key ILIKE $${params.length})`,
    );
  }
  if (options.changedOnly)
    where.push(`e.draft_revision_id IS DISTINCT FROM e.published_revision_id`);
  const rows = await withDatabase((database) =>
    database.query<ContentRow>(
      `${contentSelect()} WHERE ${where.join(" AND ")}
       ORDER BY e.kind, lower(e.title)`,
      params,
    ),
  );
  return rows.map(mapEntry);
}

export async function getContentEntry(id: string) {
  const rows = await withDatabase((database) =>
    database.query<ContentRow>(`${contentSelect()} WHERE e.id = $1`, [id]),
  );
  if (!rows[0]) return null;
  const revisions = await withDatabase((database) =>
    database.query<{
      id: string;
      version: number;
      data: Record<string, unknown>;
      validation_errors: string[];
      profile_name: string | null;
      note: string;
      created_at: Date | string;
    }>(
      `SELECT r.id, r.version, r.data, r.validation_errors, p.name AS profile_name,
        r.note, r.created_at
       FROM content_revisions r LEFT JOIN admin_profiles p ON p.id = r.profile_id
       WHERE r.entry_id = $1 ORDER BY r.version DESC LIMIT 50`,
      [id],
    ),
  );
  return {
    entry: mapEntry(rows[0]),
    revisions: revisions.map((revision) => ({
      id: revision.id,
      version: revision.version,
      data: revision.data,
      validationErrors: revision.validation_errors || [],
      profileName: revision.profile_name,
      note: revision.note,
      createdAt: iso(revision.created_at),
    })),
  };
}

export async function saveContentDraft(
  actor: AdminProfile,
  id: string,
  input: {
    version: number;
    data: Record<string, unknown>;
    note?: string;
    title?: string;
    route?: string | null;
  },
) {
  const errors = validateContent(input.data);
  await withDatabase(
    async (database) => {
      const current = await database.query<{ draft_version: number | null }>(
        `SELECT r.version AS draft_version
       FROM content_entries e LEFT JOIN content_revisions r ON r.id = e.draft_revision_id
       WHERE e.id = $1 AND e.deleted_at IS NULL FOR UPDATE OF e`,
        [id],
      );
      if (!current[0]) throw new HttpError(404, "Content entry not found.");
      if ((current[0].draft_version || 0) !== input.version) {
        throw new HttpError(
          409,
          "This content changed in another session. Reload before saving.",
        );
      }
      const nextVersion = input.version + 1;
      const revisionId = crypto.randomUUID();
      await database.query(
        `INSERT INTO content_revisions
        (id, entry_id, version, data, validation_errors, profile_id, note)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)`,
        [
          revisionId,
          id,
          nextVersion,
          JSON.stringify(input.data),
          JSON.stringify(errors),
          actor.id,
          input.note?.trim() || "",
        ],
      );
      await database.query(
        `UPDATE content_entries SET draft_revision_id = $2,
        title = COALESCE($3, title), route = COALESCE($4, route), updated_at = now()
       WHERE id = $1`,
        [id, revisionId, input.title?.trim() || null, input.route ?? null],
      );
      await audit(database, actor.id, "content.draft.saved", "content", id, {
        version: nextVersion,
        errors: errors.length,
      });
    },
    { transaction: true },
  );
  return getContentEntry(id);
}

export async function saveCopyDraft(
  actor: AdminProfile,
  key: string,
  value: string,
) {
  const entryKey = `copy:${key}`;
  const rows = await withDatabase((database) =>
    database.query<{ id: string; version: number }>(
      `SELECT e.id, r.version FROM content_entries e
       JOIN content_revisions r ON r.id = e.draft_revision_id
       WHERE e.key = $1`,
      [entryKey],
    ),
  );
  if (rows[0]) {
    return saveContentDraft(actor, rows[0].id, {
      version: rows[0].version,
      data: { value },
      note: "Inline edit",
    });
  }

  const entryId = crypto.randomUUID();
  const revisionId = crypto.randomUUID();
  await withDatabase(
    async (database) => {
      await database.query(
        `INSERT INTO content_entries
        (id, key, kind, title, draft_revision_id)
       VALUES ($1, $2, 'copy', $3, $4)`,
        [entryId, entryKey, key.replace(/[._-]+/g, " "), revisionId],
      );
      await database.query(
        `INSERT INTO content_revisions (id, entry_id, version, data, profile_id, note)
       VALUES ($1, $2, 1, $3::jsonb, $4, 'Inline edit')`,
        [revisionId, entryId, JSON.stringify({ value }), actor.id],
      );
      await audit(
        database,
        actor.id,
        "content.copy.created",
        "content",
        entryId,
        { key },
      );
    },
    { transaction: true },
  );
  return getContentEntry(entryId);
}

export async function resetCopyDraft(actor: AdminProfile, key: string) {
  const rows = await withDatabase((database) =>
    database.query<{
      id: string;
      version: number;
      published_data: Record<string, unknown> | null;
    }>(
      `SELECT e.id, dr.version, pr.data AS published_data
       FROM content_entries e
       JOIN content_revisions dr ON dr.id = e.draft_revision_id
       LEFT JOIN content_revisions pr ON pr.id = e.published_revision_id
       WHERE e.key = $1`,
      [`copy:${key}`],
    ),
  );
  if (!rows[0]) return null;
  if (!rows[0].published_data) {
    await withDatabase(
      async (database) => {
        await database.query(
          `UPDATE content_entries SET deleted_at = now(), updated_at = now() WHERE id = $1`,
          [rows[0]!.id],
        );
        await audit(
          database,
          actor.id,
          "content.copy.reset",
          "content",
          rows[0]!.id,
          { key },
        );
      },
      { transaction: true },
    );
    return null;
  }
  return saveContentDraft(actor, rows[0].id, {
    version: rows[0].version,
    data: rows[0].published_data,
    note: "Reset inline draft to published value",
  });
}

export async function rollbackContentDraft(
  actor: AdminProfile,
  entryId: string,
  revisionId: string,
) {
  const rows = await withDatabase((database) =>
    database.query<{ data: Record<string, unknown> }>(
      `SELECT data FROM content_revisions WHERE id = $1 AND entry_id = $2`,
      [revisionId, entryId],
    ),
  );
  if (!rows[0]) throw new HttpError(404, "Revision not found.");
  const current = await getContentEntry(entryId);
  if (!current) throw new HttpError(404, "Content entry not found.");
  return saveContentDraft(actor, entryId, {
    version: current.entry.draftVersion,
    data: rows[0].data,
    note: `Restored revision ${revisionId}`,
  });
}

export async function listContentReleases(): Promise<ContentRelease[]> {
  const rows = await withDatabase((database) =>
    database.query<ReleaseRow>(
      `SELECT * FROM content_releases ORDER BY number DESC LIMIT 50`,
    ),
  );
  return rows.map(mapRelease);
}

export async function publishContent(actor: AdminProfile, note: string) {
  if (process.env.ADMIN_CONTENT_PUBLISHING_ENABLED !== "true") {
    throw new HttpError(
      503,
      "Content publishing is disabled until the production Deploy Hook is configured.",
    );
  }
  if (!process.env.VERCEL_DEPLOY_HOOK_URL) {
    throw new HttpError(503, "Set VERCEL_DEPLOY_HOOK_URL before publishing.");
  }

  const release = await withDatabase(
    async (database) => {
      await database.query(
        `LOCK TABLE content_releases IN SHARE ROW EXCLUSIVE MODE`,
      );
      const active = await database.query<{ id: string }>(
        `SELECT id FROM content_releases WHERE status IN ('queued', 'deploying') LIMIT 1`,
      );
      if (active[0])
        throw new HttpError(409, "Another content release is still deploying.");

      const changed = await database.query<{
        id: string;
        draft_revision_id: string;
        validation_errors: string[];
      }>(
        `SELECT e.id, e.draft_revision_id, r.validation_errors
       FROM content_entries e JOIN content_revisions r ON r.id = e.draft_revision_id
       WHERE e.deleted_at IS NULL AND e.draft_revision_id IS DISTINCT FROM e.published_revision_id`,
      );
      if (!changed.length)
        throw new HttpError(400, "There are no draft changes to publish.");
      const invalid = changed.filter(
        (entry) => (entry.validation_errors || []).length > 0,
      );
      if (invalid.length)
        throw new HttpError(
          400,
          `${invalid.length} content entr${invalid.length === 1 ? "y has" : "ies have"} validation errors.`,
        );

      const numbers = await database.query<{ number: number }>(
        `SELECT COALESCE(max(number), 0) + 1 AS number FROM content_releases`,
      );
      const id = crypto.randomUUID();
      const number = numbers[0]?.number || 1;
      await database.query(
        `INSERT INTO content_releases (id, number, status, profile_id, note)
       VALUES ($1, $2, 'queued', $3, $4)`,
        [id, number, actor.id, note.trim()],
      );
      for (const entry of changed) {
        await database.query(
          `UPDATE content_entries SET published_revision_id = draft_revision_id, updated_at = now()
         WHERE id = $1`,
          [entry.id],
        );
      }
      // A release is a complete immutable website snapshot, not only the delta.
      // This lets any deployment materialize the exact release without depending
      // on repository defaults or earlier releases still being available.
      await database.query(
        `INSERT INTO content_release_entries (release_id, entry_id, revision_id)
       SELECT $1, id, published_revision_id
       FROM content_entries
       WHERE deleted_at IS NULL AND published_revision_id IS NOT NULL`,
        [id],
      );
      await audit(
        database,
        actor.id,
        "content.release.created",
        "content_release",
        id,
        { number, entries: changed.length },
      );
      return { id, number, changed: changed.length };
    },
    { transaction: true },
  );

  try {
    const deployment = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, {
      method: "POST",
    });
    if (!deployment.ok)
      throw new Error(`Deploy Hook returned HTTP ${deployment.status}.`);
    const payload = (await deployment.json().catch(() => ({}))) as {
      job?: { id?: string };
    };
    await withDatabase((database) =>
      database.query(
        `UPDATE content_releases SET status = 'deploying', deploy_job_id = $2 WHERE id = $1`,
        [release.id, payload.job?.id || null],
      ),
    );
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unable to start deployment.";
    await withDatabase(
      async (database) => {
        await database.query(
          `UPDATE content_releases SET status = 'failed', failure_reason = $2 WHERE id = $1`,
          [release.id, reason],
        );
        await database.query(
          `INSERT INTO notifications (profile_id, type, title, body, href, dedupe_key)
         VALUES ($1, 'content.publish_failed', 'Content publish failed', $2, '/admin/content', $3)
         ON CONFLICT (profile_id, dedupe_key) DO NOTHING`,
          [actor.id, reason.slice(0, 240), `publish-failed:${release.id}`],
        );
      },
      { transaction: true },
    );
    throw new HttpError(
      502,
      "The release is saved, but deployment could not start. Retry from Content.",
    );
  }

  return release;
}

export async function confirmContentRelease(
  actor: AdminProfile,
  releaseId: string,
) {
  const origin = process.env.PUBLIC_SITE_ORIGIN || "https://idcibidci.is";
  let live = false;
  try {
    const response = await fetch(
      `${origin.replace(/\/$/, "")}/content-version.json`,
      {
        headers: { "Cache-Control": "no-cache" },
      },
    );
    if (response.ok) {
      const payload = (await response.json()) as { releaseId?: string };
      live = payload.releaseId === releaseId;
    }
  } catch {
    live = false;
  }
  if (live) {
    await withDatabase(
      async (database) => {
        await database.query(
          `UPDATE content_releases SET status = 'live', live_at = COALESCE(live_at, now()), failure_reason = NULL WHERE id = $1`,
          [releaseId],
        );
        await database.query(
          `INSERT INTO notifications (profile_id, type, title, body, href, dedupe_key)
         VALUES ($1, 'content.live', 'Content is live', 'The production site is serving the new release.', '/admin/content', $2)
         ON CONFLICT (profile_id, dedupe_key) DO NOTHING`,
          [actor.id, `content-live:${releaseId}`],
        );
        await audit(
          database,
          actor.id,
          "content.release.live",
          "content_release",
          releaseId,
        );
      },
      { transaction: true },
    );
  }
  const releases = await listContentReleases();
  return {
    live,
    release: releases.find((release) => release.id === releaseId) || null,
  };
}

export async function contentHealth() {
  const entries = await listContentEntries();
  return entries.flatMap((entry) =>
    entry.validationErrors.map((message) => ({
      entryId: entry.id,
      key: entry.key,
      title: entry.title,
      kind: entry.kind,
      message,
      route: entry.route,
    })),
  );
}

export function validateContent(data: Record<string, unknown>) {
  const errors: string[] = [];
  inspect(data, "", errors);
  return [...new Set(errors)];
}

function inspect(value: unknown, path: string, errors: string[]) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspect(item, `${path}[${index}]`, errors));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    const childPath = path ? `${path}.${key}` : key;
    if (/alt$/i.test(key) && typeof child === "string" && !child.trim()) {
      errors.push(`${childPath} needs useful alternative text.`);
    }
    if (
      /(url|href)$/i.test(key) &&
      typeof child === "string" &&
      child &&
      !isValidLink(child)
    ) {
      errors.push(`${childPath} is not a valid URL or site path.`);
    }
    inspect(child, childPath, errors);
  }
}

function isValidLink(value: string) {
  if (
    value.startsWith("/") ||
    value.startsWith("#") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  )
    return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function contentSelect() {
  return `SELECT e.id, e.key, e.kind, e.title, e.route, e.draft_revision_id,
    e.published_revision_id, dr.version AS draft_version, dr.data AS draft_data,
    dr.validation_errors AS draft_errors, pr.version AS published_version,
    pr.data AS published_data, e.updated_at, pr.created_at AS published_at
   FROM content_entries e
   LEFT JOIN content_revisions dr ON dr.id = e.draft_revision_id
   LEFT JOIN content_revisions pr ON pr.id = e.published_revision_id`;
}

function mapEntry(row: ContentRow): ContentEntry {
  return {
    id: row.id,
    key: row.key,
    kind: row.kind,
    title: row.title,
    route: row.route,
    draft: row.draft_data || {},
    published: row.published_data,
    draftVersion: row.draft_version || 1,
    publishedVersion: row.published_version,
    validationErrors: row.draft_errors || [],
    updatedAt: iso(row.updated_at),
    publishedAt: row.published_at ? iso(row.published_at) : null,
  };
}

function mapRelease(row: ReleaseRow): ContentRelease {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    profileId: row.profile_id,
    note: row.note,
    deployJobId: row.deploy_job_id,
    failureReason: row.failure_reason,
    createdAt: iso(row.created_at),
    liveAt: row.live_at ? iso(row.live_at) : null,
  };
}

function iso(value: Date | string) {
  return new Date(value).toISOString();
}
