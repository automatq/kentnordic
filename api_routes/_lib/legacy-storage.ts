import fs from "node:fs/promises";
import path from "node:path";

import { get, list, put } from "@vercel/blob";

const LOCAL_SUBMISSION_DIR = path.resolve(
  process.cwd(),
  ".context/admin-data/submissions",
);
const LOCAL_COPY_PATH = path.resolve(
  process.cwd(),
  ".context/admin-data/copy/overrides.json",
);

export interface LegacySubmission extends Record<string, unknown> {
  id: string;
  formType: string;
  createdAt: string;
  status: "new" | "contacted" | "archived";
  summary: string;
  sourcePage: string;
  contact: { name: string; email: string; phone?: string; country?: string };
  fields: Record<string, string>;
}

export function legacyStorageDriver(): "blob" | "filesystem" | null {
  if (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_STORE_ID ||
    process.env.VERCEL_OIDC_TOKEN
  )
    return "blob";
  if (!process.env.VERCEL) return "filesystem";
  return null;
}

export async function listLegacySubmissions(
  limit = 1000,
): Promise<LegacySubmission[]> {
  const driver = legacyStorageDriver();
  if (!driver) throw new Error("Legacy Blob storage is not connected.");
  let records: LegacySubmission[];
  if (driver === "blob") {
    const result = await list({
      prefix: "submissions/",
      limit: Math.min(1000, Math.max(1, limit)),
    });
    const values = await Promise.all(
      result.blobs.map(async (blob) => {
        const stored = await get(blob.pathname, {
          access: "private",
          useCache: false,
        });
        if (!stored?.stream) return null;
        return (await new Response(stored.stream).json()) as LegacySubmission;
      }),
    );
    records = values.filter((value): value is LegacySubmission => !!value);
  } else {
    const files = await walkJsonFiles(LOCAL_SUBMISSION_DIR);
    records = await Promise.all(
      files.map(
        async (filename) =>
          JSON.parse(await fs.readFile(filename, "utf8")) as LegacySubmission,
      ),
    );
  }
  return records
    .sort(
      (left, right) => +new Date(right.createdAt) - +new Date(left.createdAt),
    )
    .slice(0, limit);
}

export async function saveLegacySubmission(submission: LegacySubmission) {
  const driver = legacyStorageDriver();
  if (!driver) throw new Error("Legacy Blob storage is not connected.");
  if (driver === "blob") {
    const date = submission.createdAt.slice(0, 10);
    const pathname = `submissions/${submission.formType}/${date}/${submission.id}.json`;
    await put(pathname, JSON.stringify(submission, null, 2), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return { driver, pathname };
  }
  const filename = path.join(LOCAL_SUBMISSION_DIR, `${submission.id}.json`);
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, JSON.stringify(submission, null, 2), "utf8");
  return { driver, pathname: filename };
}

export async function readLegacyCopyOverrides(): Promise<
  Record<string, string>
> {
  const driver = legacyStorageDriver();
  if (!driver) return {};
  if (driver === "blob") {
    try {
      const result = await get("copy/overrides.json", {
        access: "private",
        useCache: false,
      });
      if (!result?.stream) return {};
      return (await new Response(result.stream).json()) as Record<
        string,
        string
      >;
    } catch (error) {
      if (notFound(error)) return {};
      throw error;
    }
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL_COPY_PATH, "utf8")) as Record<
      string,
      string
    >;
  } catch (error) {
    if (notFound(error)) return {};
    throw error;
  }
}

export function getLegacyLocalPhotoPath(filename: string) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(filename)) return null;
  return path.resolve(process.cwd(), ".context/admin-data/photos", filename);
}

export function legacyPhotoContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  return (
    (
      {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".avif": "image/avif",
      } as Record<string, string>
    )[extension] || "application/octet-stream"
  );
}

async function walkJsonFiles(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return (
      await Promise.all(
        entries.map(async (entry) => {
          const target = path.join(directory, entry.name);
          if (entry.isDirectory()) return walkJsonFiles(target);
          return target.endsWith(".json") ? [target] : [];
        }),
      )
    ).flat();
  } catch (error) {
    if (notFound(error)) return [];
    throw error;
  }
}

function notFound(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    (("status" in error && error.status === 404) ||
      ("code" in error && error.code === "ENOENT"))
  );
}
