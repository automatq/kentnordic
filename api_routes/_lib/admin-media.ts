import { get, put } from "@vercel/blob";
import sharp from "sharp";

import type { AdminProfile, MediaAsset } from "../../shared/admin-contracts.js";
import { audit } from "./admin-auth.js";
import { withDatabase, type DatabaseSession } from "./database.js";
import { HttpError } from "./http.js";

interface MediaRow extends Record<string, unknown> {
  id: string;
  pathname: string;
  url: string;
  filename: string;
  mime_type: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  focal_x: number;
  focal_y: number;
  status: MediaAsset["status"];
  variants: Record<string, string> | null;
  usage_count: number;
  created_at: Date | string;
  deleted_at: Date | string | null;
}

export interface UploadTokenPayload {
  assetId: string;
  profileId: string;
  alt: string;
  filename: string;
}

export async function registerAndProcessUpload(options: {
  blob: {
    pathname: string;
    url: string;
    contentType?: string;
  };
  payload: UploadTokenPayload;
}) {
  const { blob, payload } = options;
  await withDatabase((database) =>
    database.query(
      `INSERT INTO media_assets
        (id, pathname, url, filename, mime_type, bytes, alt, status, profile_id)
       VALUES ($1, $2, $3, $4, $5, 0, $6, 'processing', $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        payload.assetId,
        blob.pathname,
        blob.url,
        payload.filename,
        blob.contentType || "image/jpeg",
        payload.alt,
        payload.profileId,
      ],
    ),
  );

  try {
    const source = await downloadBlob(blob.url, blob.pathname);
    const image = sharp(source, { limitInputPixels: 80_000_000 });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height)
      throw new Error("Image dimensions could not be read.");
    const widths = [480, 768, 1280, 1920].filter(
      (width) => width <= metadata.width!,
    );
    if (!widths.includes(metadata.width)) widths.push(metadata.width);
    const variants: Record<string, string> = {};

    for (const width of [...new Set(widths)].sort((a, b) => a - b)) {
      const resized = sharp(source)
        .rotate()
        .resize({ width, withoutEnlargement: true });
      for (const format of ["avif", "webp", "jpeg"] as const) {
        const bytes =
          format === "avif"
            ? await resized.clone().avif({ quality: 68 }).toBuffer()
            : format === "webp"
              ? await resized.clone().webp({ quality: 78 }).toBuffer()
              : await resized
                  .clone()
                  .jpeg({ quality: 82, progressive: true })
                  .toBuffer();
        const result = await put(
          `media/variants/${payload.assetId}/${width}.${format === "jpeg" ? "jpg" : format}`,
          bytes,
          {
            access: "public",
            addRandomSuffix: false,
            contentType: format === "jpeg" ? "image/jpeg" : `image/${format}`,
          },
        );
        variants[`${width}-${format}`] = result.url;
      }
    }

    await withDatabase((database) =>
      database.query(
        `UPDATE media_assets SET width = $2, height = $3, bytes = $4,
          variants = $5::jsonb, status = 'ready', failure_reason = NULL,
          updated_at = now() WHERE id = $1`,
        [
          payload.assetId,
          metadata.width,
          metadata.height,
          source.length,
          JSON.stringify(variants),
        ],
      ),
    );
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Image processing failed.";
    await withDatabase(
      async (database) => {
        await database.query(
          `UPDATE media_assets SET status = 'failed', failure_reason = $2, updated_at = now() WHERE id = $1`,
          [payload.assetId, reason.slice(0, 1_000)],
        );
        await database.query(
          `INSERT INTO notifications (profile_id, type, title, body, href, dedupe_key)
         VALUES ($1, 'media.failed', 'Image processing failed', $2, '/admin/media', $3)
         ON CONFLICT (profile_id, dedupe_key) DO NOTHING`,
          [
            payload.profileId,
            reason.slice(0, 240),
            `media-failed:${payload.assetId}`,
          ],
        );
      },
      { transaction: true },
    );
  }
}

export async function listMedia(query = "") {
  const rows = await withDatabase((database) =>
    database.query<MediaRow>(
      `SELECT m.id, m.pathname, m.url, m.filename, m.mime_type, m.bytes,
        m.width, m.height, m.alt, m.focal_x, m.focal_y, m.status,
        m.variants, m.created_at, m.deleted_at,
        (SELECT count(*)::int FROM content_revisions r WHERE r.data::text LIKE '%' || m.url || '%') AS usage_count
       FROM media_assets m
       WHERE ($1 = '' OR m.filename ILIKE '%' || $1 || '%' OR m.alt ILIKE '%' || $1 || '%')
       ORDER BY m.created_at DESC LIMIT 250`,
      [query.trim()],
    ),
  );
  return rows.map(mapMedia);
}

export async function updateMedia(
  actor: AdminProfile,
  id: string,
  input: { alt?: string; focalX?: number; focalY?: number; restore?: boolean },
) {
  await withDatabase(
    async (database) => {
      const params: unknown[] = [id];
      const sets = ["updated_at = now()"];
      if (input.alt !== undefined) {
        params.push(input.alt.trim());
        sets.push(`alt = $${params.length}`);
      }
      if (input.focalX !== undefined) {
        params.push(Math.round(input.focalX * 100));
        sets.push(`focal_x = $${params.length}`);
      }
      if (input.focalY !== undefined) {
        params.push(Math.round(input.focalY * 100));
        sets.push(`focal_y = $${params.length}`);
      }
      if (input.restore) sets.push("status = 'ready'", "deleted_at = NULL");
      const changed = await database.query<{ id: string }>(
        `UPDATE media_assets SET ${sets.join(", ")} WHERE id = $1 RETURNING id`,
        params,
      );
      if (!changed[0]) throw new HttpError(404, "Media asset not found.");
      await audit(database, actor.id, "media.updated", "media", id, {
        fields: Object.keys(input),
      });
    },
    { transaction: true },
  );
}

export async function trashMedia(actor: AdminProfile, id: string) {
  await withDatabase(
    async (database) => {
      const usage = await mediaUsage(database, id);
      if (usage > 0)
        throw new HttpError(
          409,
          `This image is used in ${usage} content revision${usage === 1 ? "" : "s"}. Replace it before deleting.`,
        );
      const changed = await database.query<{ id: string }>(
        `UPDATE media_assets SET status = 'trashed', deleted_at = now(), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [id],
      );
      if (!changed[0]) throw new HttpError(404, "Media asset not found.");
      await audit(database, actor.id, "media.trashed", "media", id);
    },
    { transaction: true },
  );
}

async function mediaUsage(database: DatabaseSession, id: string) {
  const rows = await database.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM content_revisions r
     JOIN media_assets m ON m.id = $1
     WHERE r.data::text LIKE '%' || m.url || '%'`,
    [id],
  );
  return rows[0]?.count || 0;
}

async function downloadBlob(url: string, pathname: string) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const result = await get(pathname, { access: "public", useCache: false });
      if (result?.stream)
        return Buffer.from(await new Response(result.stream).arrayBuffer());
    } catch {
      // Public fetch below also works for OIDC-backed stores.
    }
  }
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Could not read uploaded image (HTTP ${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

function mapMedia(row: MediaRow): MediaAsset {
  return {
    id: row.id,
    pathname: row.pathname,
    url: row.url,
    filename: row.filename,
    mimeType: row.mime_type,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    alt: row.alt,
    focalX: row.focal_x / 100,
    focalY: row.focal_y / 100,
    status: row.status,
    variants: row.variants || {},
    usageCount: row.usage_count,
    createdAt: new Date(row.created_at).toISOString(),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
  };
}
