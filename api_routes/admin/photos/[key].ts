import { requireProfile } from "../../_lib/admin-auth";
import {
  json,
  methodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from "../../_lib/http";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["POST", "DELETE"].includes(request.method))
    return methodNotAllowed(response, ["POST", "DELETE"]);
  const session = await requireProfile(request, response, ["editor", "owner"]);
  if (!session) return;
  return json(response, 410, {
    ok: false,
    error:
      "Use the direct media uploader. Legacy Function-body uploads are disabled.",
  });
}
