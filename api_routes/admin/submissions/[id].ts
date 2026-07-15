import { requireProfile } from "../../_lib/admin-auth.js";
import {
  json,
  methodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from "../../_lib/http.js";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["PATCH", "DELETE"].includes(request.method))
    return methodNotAllowed(response, ["PATCH", "DELETE"]);
  const session = await requireProfile(request, response, ["owner"]);
  if (!session) return;
  return json(response, 410, {
    ok: false,
    readOnly: true,
    error:
      "Legacy submissions are read-only. Manage the imported lead in the CRM.",
  });
}
