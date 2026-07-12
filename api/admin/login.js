import {
  checkLoginRateLimit,
  isAdminConfigured,
  loginAdmin,
  recordLoginFailure,
  recordLoginSuccess,
  verifyAdminPassword,
} from "../_lib/auth.js";
import { getClientIp, json, methodNotAllowed, readRequestBody } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  if (!isAdminConfigured()) {
    return json(res, 503, {
      ok: false,
      error: "Admin login is not configured. Set ADMIN_PASSWORD first.",
      configured: false,
    });
  }

  const ip = getClientIp(req);
  const rateLimit = checkLoginRateLimit(ip);
  if (rateLimit.limited) {
    const minutes = Math.ceil(rateLimit.retryAfterMs / 60000);
    res.setHeader("Retry-After", String(Math.ceil(rateLimit.retryAfterMs / 1000)));
    return json(res, 429, {
      ok: false,
      error: `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    });
  }

  const body = await readRequestBody(req);
  const password = typeof body.password === "string" ? body.password : "";

  if (!verifyAdminPassword(password)) {
    recordLoginFailure(ip);
    return json(res, 401, { ok: false, error: "Incorrect password." });
  }

  recordLoginSuccess(ip);
  const session = loginAdmin(res);
  return json(res, 200, { ok: true, authenticated: true, ...session });
}
