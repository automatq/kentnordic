import { getAdminSession } from "../_lib/auth.js";
import { json, methodNotAllowed } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  return json(res, 200, getAdminSession(req));
}
