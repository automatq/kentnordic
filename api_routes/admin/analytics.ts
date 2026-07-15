import { requireProfile } from "../_lib/admin-auth.js";
import { getAnalytics } from "../_lib/admin-crm.js";
import {
  apiError,
  json,
  methodNotAllowed,
  requestUrl,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const session = await requireProfile(request, response, ["sales", "owner"]);
    if (!session) return;
    const days = Number(requestUrl(request).searchParams.get("days") || 30);
    return json(response, 200, {
      ok: true,
      analytics: await getAnalytics(days),
    });
  } catch (error) {
    return apiError(response, error, "Unable to load analytics.");
  }
}
