import { requireProfile } from "../_lib/admin-auth";
import { emailConfiguration, listEmailTemplates } from "../_lib/admin-email";
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
