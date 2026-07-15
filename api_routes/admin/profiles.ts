import { ProfileCreateSchema } from "../../shared/admin-contracts.js";
import {
  createProfile,
  listProfiles,
  requireGateway,
} from "../_lib/admin-auth.js";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["GET", "POST"].includes(request.method)) {
    return methodNotAllowed(response, ["GET", "POST"]);
  }
  try {
    requireGateway(request);
    if (request.method === "GET") {
      return json(response, 200, { ok: true, profiles: await listProfiles() });
    }
    const input = ProfileCreateSchema.parse(await readRequestBody(request));
    const profile = await createProfile(input.name, input.pin);
    return json(response, 201, { ok: true, profile });
  } catch (error) {
    return apiError(response, error, "Unable to manage admin profiles.");
  }
}
