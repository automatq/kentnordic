import { z } from "zod";

import {
  AssignmentRuleSchema,
  RetentionSettingSchema,
  WorkspaceSettingSchema,
} from "../../shared/admin-contracts.js";
import { requireCsrf, requireProfile } from "../_lib/admin-auth.js";
import { getAdminSettings, updateSetting } from "../_lib/admin-settings.js";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";

const SettingInput = z.discriminatedUnion("key", [
  z.object({ key: z.literal("workspace"), value: WorkspaceSettingSchema }),
  z.object({ key: z.literal("retention"), value: RetentionSettingSchema }),
  z.object({
    key: z.literal("assignment_rules"),
    value: z.array(AssignmentRuleSchema).max(100),
  }),
]);

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["GET", "PATCH"].includes(request.method))
    return methodNotAllowed(response, ["GET", "PATCH"]);
  try {
    const session = await requireProfile(request, response, ["owner"]);
    if (!session) return;
    if (request.method === "GET")
      return json(response, 200, {
        ok: true,
        settings: await getAdminSettings(session.profile.id),
      });
    requireCsrf(request, session);
    const input = SettingInput.parse(
      await readRequestBody(request, 256 * 1024),
    );
    await updateSetting(session.profile, input.key, input.value);
    return json(response, 200, { ok: true });
  } catch (error) {
    return apiError(response, error, "Unable to update settings.");
  }
}
