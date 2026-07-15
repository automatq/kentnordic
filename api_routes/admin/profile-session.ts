import { ProfileUnlockSchema } from "../../shared/admin-contracts.js";
import {
  lockProfile,
  requireGateway,
  unlockProfile,
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
  if (!request.method || !["POST", "DELETE"].includes(request.method)) {
    return methodNotAllowed(response, ["POST", "DELETE"]);
  }
  try {
    requireGateway(request);
    if (request.method === "DELETE") {
      await lockProfile(request, response);
      return json(response, 200, { ok: true, authenticated: false });
    }
    const input = ProfileUnlockSchema.parse(await readRequestBody(request));
    const session = await unlockProfile(
      request,
      response,
      input.profileId,
      input.pin,
    );
    return json(response, 200, { ok: true, authenticated: true, ...session });
  } catch (error) {
    return apiError(response, error, "Unable to unlock that profile.");
  }
}
