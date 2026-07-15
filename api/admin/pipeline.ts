import { requireProfile } from "../_lib/admin-auth";
import { listPipelineStages } from "../_lib/admin-crm";
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
    const session = await requireProfile(request, response);
    if (!session) return;
    return json(response, 200, {
      ok: true,
      stages: await listPipelineStages(),
    });
  } catch (error) {
    return apiError(response, error, "Unable to load the pipeline.");
  }
}
