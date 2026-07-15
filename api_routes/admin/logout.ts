import { logoutAdmin } from "../_lib/admin-auth";
import {
  apiError,
  json,
  methodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    await logoutAdmin(request, response);
    return json(response, 200, { ok: true, authenticated: false });
  } catch (error) {
    return apiError(response, error, "Unable to sign out.");
  }
}
