import { requireAdmin } from "../_lib/auth.js";
import { json, methodNotAllowed, requestUrl } from "../_lib/http.js";
import { getStorageDriver, listSubmissions } from "../_lib/storage.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    const url = requestUrl(req);
    const rawLimit = Number(url.searchParams.get("limit") || "100");
    const limit = Number.isFinite(rawLimit) ? rawLimit : 100;
    const submissions = await listSubmissions(limit);

    return json(res, 200, {
      ok: true,
      storageDriver: getStorageDriver(),
      submissions,
    });
  } catch (error) {
    return json(res, getStorageDriver() ? 500 : 503, {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to load submissions.",
    });
  }
}
