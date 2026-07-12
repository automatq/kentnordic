import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { del, get, list, put } from "@vercel/blob";

const LOCAL_DATA_DIR = path.resolve(
  process.cwd(),
  ".context/admin-data/submissions",
);

export function getStorageDriver() {
  if (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.BLOB_STORE_ID ||
    process.env.VERCEL_OIDC_TOKEN
  ) {
    return "blob";
  }

  if (!process.env.VERCEL) return "filesystem";
  return null;
}

function requireDriver() {
  const driver = getStorageDriver();
  if (!driver) {
    throw new Error(
      "No persistent storage configured. Connect a private Vercel Blob store before using the admin backend in production.",
    );
  }
  return driver;
}

export async function saveSubmission(submission) {
  const driver = requireDriver();

  if (driver === "blob") {
    const pathname = blobPathname(submission);
    await put(pathname, JSON.stringify(submission, null, 2), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return { driver, pathname };
  }

  const filePath = localFilePath(submission);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(submission, null, 2), "utf8");
  return { driver, pathname: filePath };
}

export async function listSubmissions(limit = 100) {
  const driver = requireDriver();

  if (driver === "blob") {
    const { blobs } = await list({
      prefix: "submissions/",
      limit: Math.min(Math.max(limit, 1), 1000),
    });

    const submissions = await Promise.all(
      blobs.map(async (blob) => {
        const result = await get(blob.pathname, {
          access: "private",
          useCache: false,
        });
        if (!result?.stream) return null;
        return new Response(result.stream).json();
      }),
    );

    return submissions.filter(Boolean).sort(sortNewestFirst).slice(0, limit);
  }

  const files = await walkJsonFiles(LOCAL_DATA_DIR);
  const submissions = await Promise.all(
    files.map(async (filePath) =>
      JSON.parse(await fs.readFile(filePath, "utf8")),
    ),
  );

  return submissions.sort(sortNewestFirst).slice(0, limit);
}

export function createSubmissionId() {
  return crypto.randomUUID();
}

/** Blob pathnames are namespaced by formType/date (see blobPathname below),
    so updates/deletes by id alone need a lookup pass first. */
async function findBlobPathname(id) {
  const { blobs } = await list({ prefix: "submissions/", limit: 1000 });
  const match = blobs.find((blob) => blob.pathname.endsWith(`/${id}.json`));
  return match?.pathname ?? null;
}

export async function updateSubmissionStatus(id, status) {
  const driver = requireDriver();

  if (driver === "blob") {
    const pathname = await findBlobPathname(id);
    if (!pathname) return null;
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result?.stream) return null;
    const submission = await new Response(result.stream).json();
    submission.status = status;
    await put(pathname, JSON.stringify(submission, null, 2), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return submission;
  }

  const filePath = path.join(LOCAL_DATA_DIR, `${id}.json`);
  try {
    const submission = JSON.parse(await fs.readFile(filePath, "utf8"));
    submission.status = status;
    await fs.writeFile(filePath, JSON.stringify(submission, null, 2), "utf8");
    return submission;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function deleteSubmission(id) {
  const driver = requireDriver();

  if (driver === "blob") {
    const pathname = await findBlobPathname(id);
    if (!pathname) return false;
    await del(pathname);
    return true;
  }

  const filePath = path.join(LOCAL_DATA_DIR, `${id}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function sortNewestFirst(left, right) {
  return (
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function blobPathname(submission) {
  const date = submission.createdAt.slice(0, 10);
  return `submissions/${submission.formType}/${date}/${submission.id}.json`;
}

function localFilePath(submission) {
  return path.join(LOCAL_DATA_DIR, `${submission.id}.json`);
}

async function walkJsonFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const target = path.join(dir, entry.name);
        if (entry.isDirectory()) return walkJsonFiles(target);
        return target.endsWith(".json") ? [target] : [];
      }),
    );
    return files.flat();
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
