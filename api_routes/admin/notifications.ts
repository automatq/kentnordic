import { requireCsrf, requireProfile } from "../_lib/admin-auth";
import { listNotifications, markAllNotificationsRead } from "../_lib/admin-crm";
import {
  apiError,
  json,
  methodNotAllowed,
  requestUrl,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["GET", "PATCH"].includes(request.method))
    return methodNotAllowed(response, ["GET", "PATCH"]);
  try {
    const session = await requireProfile(request, response);
    if (!session) return;
    if (request.method === "GET") {
      const includeRead =
        requestUrl(request).searchParams.get("includeRead") === "true";
      const notifications = await listNotifications(
        session.profile.id,
        includeRead,
      );
      return json(response, 200, { ok: true, notifications });
    }
    requireCsrf(request, session);
    await markAllNotificationsRead(session.profile.id);
    return json(response, 200, { ok: true });
  } catch (error) {
    return apiError(response, error, "Unable to manage notifications.");
  }
}
