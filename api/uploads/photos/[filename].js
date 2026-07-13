import fs from "node:fs/promises";

import { json, methodNotAllowed } from "../../../_lib/http.js";
import { getLocalPhotoPath, getPhotoContentType } from "../../../_lib/photoStore.js";
import { getStorageDriver } from "../../../_lib/storage.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  if (getStorageDriver() !== "filesystem") {
    return json(res, 404, { ok: false, error: "Photo not found." });
  }

  const filename = String(req.query?.filename || "").trim();
  const filePath = getLocalPhotoPath(filename);
  if (!filePath) {
    return json(res, 400, { ok: false, error: "Invalid photo filename." });
  }

  try {
    const buffer = await fs.readFile(filePath);
    res.status(200);
    res.setHeader("Content-Type", getPhotoContentType(filename));
    res.setHeader("Cache-Control", "public, max-age=60");
    res.send(buffer);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return json(res, 404, { ok: false, error: "Photo not found." });
    }
    return json(res, 500, {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to load photo.",
    });
  }
}
