import { z } from "zod";

import { requireCsrf, requireProfile } from "../_lib/admin-auth";
import {
  getAdminSettings,
  updateNotificationPreferences,
} from "../_lib/admin-settings";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";

const PreferencesInput = z.object({
  browser: z.boolean().optional(),
  emailImmediate: z.boolean().optional(),
  emailDigest: z.boolean().optional(),
});

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
      const settings = await getAdminSettings(session.profile.id);
      return json(response, 200, {
        ok: true,
        preferences: settings.notificationPreferences,
      });
    }
    requireCsrf(request, session);
    await updateNotificationPreferences(
      session.profile.id,
      PreferencesInput.parse(await readRequestBody(request)),
    );
    return json(response, 200, { ok: true });
  } catch (error) {
    return apiError(
      response,
      error,
      "Unable to update notification preferences.",
    );
  }
}
