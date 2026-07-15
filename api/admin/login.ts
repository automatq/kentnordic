import { loginGateway } from "../_lib/admin-auth";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const body = await readRequestBody(request);
    const session = await loginGateway(
      request,
      response,
      String(body.password || ""),
    );
    return json(response, 200, { ok: true, ...session });
  } catch (error) {
    return apiError(response, error, "Unable to unlock the admin workspace.");
  }
}
