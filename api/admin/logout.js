import { logoutAdmin } from "../_lib/auth.js";
import { json, methodNotAllowed } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  logoutAdmin(res);
  return json(res, 200, { ok: true, authenticated: false });
}
