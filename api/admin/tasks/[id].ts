import { z } from "zod";

import { requireCsrf, requireProfile } from "../../_lib/admin-auth";
import { updateTask } from "../../_lib/admin-crm";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../../_lib/http";

const TaskPatch = z.object({
  status: z.enum(["open", "completed", "cancelled"]).optional(),
  dueAt: z.string().datetime().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "PATCH") return methodNotAllowed(response, ["PATCH"]);
  try {
    const session = await requireProfile(request, response, ["sales", "owner"]);
    if (!session) return;
    requireCsrf(request, session);
    const id = Array.isArray(request.query?.id)
      ? request.query?.id[0]
      : request.query?.id;
    if (!id)
      return json(response, 400, { ok: false, error: "Task id is required." });
    await updateTask(
      session.profile,
      id,
      TaskPatch.parse(await readRequestBody(request)),
    );
    return json(response, 200, { ok: true });
  } catch (error) {
    return apiError(response, error, "Unable to update the task.");
  }
}
