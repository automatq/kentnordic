import { z } from "zod";

import { requireCsrf, requireProfile } from "../../_lib/admin-auth";
import { updateNotification } from "../../_lib/admin-crm";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../../_lib/http";

const NotificationPatch = z.object({
  action: z.enum(["read", "unread", "dismiss"]),
});

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "PATCH") return methodNotAllowed(response, ["PATCH"]);
  try {
    const session = await requireProfile(request, response);
    if (!session) return;
    requireCsrf(request, session);
    const id = Array.isArray(request.query?.id)
      ? request.query?.id[0]
      : request.query?.id;
    if (!id)
      return json(response, 400, {
        ok: false,
        error: "Notification id is required.",
      });
    const input = NotificationPatch.parse(await readRequestBody(request));
    await updateNotification(session.profile.id, id, input.action);
    return json(response, 200, { ok: true });
  } catch (error) {
    return apiError(response, error, "Unable to update the notification.");
  }
}
