import fs from "node:fs/promises";

import {
  getLegacyLocalPhotoPath,
  legacyPhotoContentType,
  legacyStorageDriver,
} from "../../_lib/legacy-storage.js";
import {
  apiError,
  json,
  methodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from "../../_lib/http.js";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  if (legacyStorageDriver() !== "filesystem")
    return json(response, 404, { ok: false, error: "Photo not found." });
  const raw = Array.isArray(request.query?.filename)
    ? request.query.filename[0]
    : request.query?.filename;
  const filename = String(raw || "").trim();
  const filePath = getLegacyLocalPhotoPath(filename);
  if (!filePath)
    return json(response, 400, { ok: false, error: "Invalid photo filename." });
  try {
    const buffer = await fs.readFile(filePath);
    response.status(200);
    response.setHeader("Content-Type", legacyPhotoContentType(filename));
    response.setHeader("Cache-Control", "public, max-age=60");
    response.end(buffer);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return json(response, 404, { ok: false, error: "Photo not found." });
    return apiError(response, error, "Unable to load photo.");
  }
}
