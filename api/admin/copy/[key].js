import { requireAdmin } from "../../_lib/auth.js";
import {
  deleteCopyOverride,
  saveCopyOverride,
} from "../../_lib/copyStore.js";
import { json, methodNotAllowed, readRequestBody } from "../../_lib/http.js";

export default async function handler(req, res) {
  if (!["PUT", "DELETE"].includes(req.method || "")) {
    return methodNotAllowed(res, ["PUT", "DELETE"]);
  }

  if (!requireAdmin(req, res)) return;

  const key = String(req.query?.key || "").trim();
  if (!/^[a-z0-9._-]+$/i.test(key) || key.length > 200) {
    return json(res, 400, { ok: false, error: "Invalid copy key." });
  }

  try {
    if (req.method === "DELETE") {
      await deleteCopyOverride(key);
      return json(res, 200, { ok: true, key, deleted: true });
    }

    const body = await readRequestBody(req);
    if (typeof body.value !== "string") {
      return json(res, 400, { ok: false, error: "value must be a string" });
    }

    await saveCopyOverride(key, body.value);
    return json(res, 200, { ok: true, key, value: body.value });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to save copy override.",
    });
  }
}
