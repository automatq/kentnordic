import { z } from "zod";

import { requireCsrf, requireProfile } from "../_lib/admin-auth";
import { listPipelineStages } from "../_lib/admin-crm";
import { savePipeline } from "../_lib/admin-settings";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";

const PipelineInput = z.object({
  stages: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
        category: z.enum(["open", "won", "lost", "archived"]),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        position: z.number().int().min(0),
        active: z.boolean(),
      }),
    )
    .min(1),
});

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
        stages: await listPipelineStages(),
      });
    requireCsrf(request, session);
    const input = PipelineInput.parse(await readRequestBody(request));
    await savePipeline(session.profile, input.stages);
    return json(response, 200, { ok: true });
  } catch (error) {
    return apiError(response, error, "Unable to update the pipeline.");
  }
}
