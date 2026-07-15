import { requireProfile } from "../_lib/admin-auth.js";
import { emailConfiguration, listEmailTemplates } from "../_lib/admin-email.js";
import {
  apiError,
  json,
  methodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const session = await requireProfile(request, response, ["sales", "owner"]);
    if (!session) return;
    return json(response, 200, {
      ok: true,
      configuration: emailConfiguration(),
      templates: await listEmailTemplates(),
    });
  } catch (error) {
    return apiError(response, error, "Unable to load email templates.");
  }
}
