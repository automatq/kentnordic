import { requireAdmin } from "../../_lib/auth.js";
import {
  deleteCopyOverride,
  getCopyOverride,
  saveCopyOverride,
} from "../../_lib/copyStore.js";
import { json, methodNotAllowed, readRequestBuffer } from "../../_lib/http.js";
import {
  deletePhotoByUrl,
  MAX_PHOTO_BYTES,
  savePhotoUpload,
} from "../../_lib/photoStore.js";

function photoOverrideKey(key) {
  return `photo.${key}`;
}

export default async function handler(req, res) {
  if (!["POST", "DELETE"].includes(req.method || "")) {
    return methodNotAllowed(res, ["POST", "DELETE"]);
  }

  if (!requireAdmin(req, res)) return;

  const key = String(req.query?.key || "").trim();
  if (!/^[a-z0-9._-]+$/i.test(key) || key.length > 200) {
    return json(res, 400, { ok: false, error: "Invalid photo key." });
  }

  const overrideKey = photoOverrideKey(key);

  try {
    if (req.method === "DELETE") {
      const existingUrl = await getCopyOverride(overrideKey);
      await deleteCopyOverride(overrideKey);
      if (typeof existingUrl === "string" && existingUrl) {
        await deletePhotoByUrl(existingUrl).catch(() => false);
      }
      return json(res, 200, { ok: true, key, deleted: true });
    }

    const originalName = String(req.headers["x-upload-filename"] || "").trim();
    const contentType = String(req.headers["content-type"] || "").trim();
    const buffer = await readRequestBuffer(req, { maxBytes: MAX_PHOTO_BYTES });
    const existingUrl = await getCopyOverride(overrideKey);
    const saved = await savePhotoUpload(key, {
      buffer,
      contentType,
      originalName,
    });

    await saveCopyOverride(overrideKey, saved.url);
    if (
      typeof existingUrl === "string" &&
      existingUrl &&
      existingUrl !== saved.url
    ) {
      await deletePhotoByUrl(existingUrl).catch(() => false);
    }

    return json(res, 200, {
      ok: true,
      key,
      copyKey: overrideKey,
      url: saved.url,
    });
  } catch (error) {
    const statusCode =
      error?.statusCode ||
      (error?.code === "PAYLOAD_TOO_LARGE" ? 413 : 500);
    return json(res, statusCode, {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save photo override.",
    });
  }
}
