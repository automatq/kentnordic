import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { del, put } from "@vercel/blob";

import { getStorageDriver } from "./storage.js";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const LOCAL_PHOTO_DIR = path.resolve(
  process.cwd(),
  ".context/admin-data/photos",
);

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function savePhotoUpload(photoKey, file) {
  const driver = requireDriver();
  const normalized = normalizeUpload(file);
  const filename = `${Date.now()}-${crypto.randomUUID()}${normalized.ext}`;

  if (driver === "blob") {
    const pathname = `photos/${photoKey}/${filename}`;
    const result = await put(pathname, file.buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: normalized.contentType,
    });
    return { driver, filename, url: result.url };
  }

  await fs.mkdir(LOCAL_PHOTO_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_PHOTO_DIR, filename), file.buffer);
  return { driver, filename, url: `/api/uploads/photos/${filename}` };
}

export async function deletePhotoByUrl(url) {
  if (!url) return false;
  const driver = getStorageDriver();
  if (!driver) return false;

  if (driver === "blob") {
    const pathname = blobPathnameFromUrl(url);
    if (!pathname) return false;
    await del(pathname);
    return true;
  }

  const filename = localFilenameFromUrl(url);
  if (!filename) return false;
  try {
    await fs.unlink(path.join(LOCAL_PHOTO_DIR, filename));
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export function getLocalPhotoPath(filename) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(filename)) return null;
  return path.join(LOCAL_PHOTO_DIR, filename);
}

export function getPhotoContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

function normalizeUpload(file) {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw badRequest("No file uploaded.");
  }

  if (file.buffer.length > MAX_PHOTO_BYTES) {
    throw payloadTooLarge();
  }

  const rawName = String(file.originalName || "").trim();
  const ext = path.extname(rawName).toLowerCase();
  const contentType = String(file.contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const expectedType = MIME_BY_EXT[ext];

  if (!rawName || !expectedType || contentType !== expectedType) {
    throw badRequest("Only JPG, PNG, WEBP, and AVIF images are allowed.");
  }

  return { ext, contentType };
}

function requireDriver() {
  const driver = getStorageDriver();
  if (!driver) {
    throw new Error(
      "No persistent storage configured. Connect a private Vercel Blob store before using photo overrides in production.",
    );
  }
  return driver;
}

function blobPathnameFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
}

function localFilenameFromUrl(url) {
  try {
    const parsed = new URL(url, "http://localhost");
    const segments = parsed.pathname.split("/");
    const filename = segments[segments.length - 1] || "";
    return /^[a-z0-9][a-z0-9._-]*$/i.test(filename) ? filename : null;
  } catch {
    return null;
  }
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function payloadTooLarge() {
  const error = new Error("File too large. Max size is 10 MB.");
  error.code = "PAYLOAD_TOO_LARGE";
  error.statusCode = 413;
  return error;
}
