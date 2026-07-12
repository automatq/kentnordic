import { listCopyOverrides } from "./_lib/copyStore.js";
import { json, methodNotAllowed } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const overrides = await listCopyOverrides();
    res.setHeader("Cache-Control", "public, max-age=10");
    return json(res, 200, overrides);
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to load copy overrides.",
    });
  }
}
