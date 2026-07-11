import {
  isAdminConfigured,
  loginAdmin,
  verifyAdminPassword,
} from "../_lib/auth.js";
import { json, methodNotAllowed, readRequestBody } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  if (!isAdminConfigured()) {
    return json(res, 503, {
      ok: false,
      error: "Admin login is not configured. Set ADMIN_PASSWORD first.",
      configured: false,
    });
  }

  const body = await readRequestBody(req);
  const password = typeof body.password === "string" ? body.password : "";

  if (!verifyAdminPassword(password)) {
    return json(res, 401, { ok: false, error: "Incorrect password." });
  }

  const session = loginAdmin(res);
  return json(res, 200, { ok: true, authenticated: true, ...session });
}
