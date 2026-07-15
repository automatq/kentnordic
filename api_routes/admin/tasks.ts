import { z } from "zod";

import { requireCsrf, requireProfile } from "../_lib/admin-auth.js";
import { createTask, listTasks } from "../_lib/admin-crm.js";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  requestUrl,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";

const TaskInput = z.object({
  leadId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(240),
  notes: z.string().trim().max(4_000).optional(),
  dueAt: z.string().datetime(),
});

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["GET", "POST"].includes(request.method))
    return methodNotAllowed(response, ["GET", "POST"]);
  try {
    const session = await requireProfile(request, response, ["sales", "owner"]);
    if (!session) return;
    if (request.method === "GET") {
      const search = requestUrl(request).searchParams;
      const allProfiles =
        search.get("scope") === "team" &&
        session.profile.roles.includes("owner");
      const tasks = await listTasks({
        profileId: session.profile.id,
        allProfiles,
        includeCompleted: search.get("completed") === "true",
      });
      return json(response, 200, { ok: true, tasks });
    }
    requireCsrf(request, session);
    const input = TaskInput.parse(await readRequestBody(request));
    const id = await createTask(session.profile, input);
    return json(response, 201, { ok: true, id });
  } catch (error) {
    return apiError(response, error, "Unable to manage tasks.");
  }
}
