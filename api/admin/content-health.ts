import { requireProfile } from "../_lib/admin-auth";
import { contentHealth } from "../_lib/admin-content";
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
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const session = await requireProfile(request, response, [
      "editor",
      "owner",
    ]);
    if (!session) return;
    return json(response, 200, { ok: true, issues: await contentHealth() });
  } catch (error) {
    return apiError(response, error, "Unable to run content health checks.");
  }
}
