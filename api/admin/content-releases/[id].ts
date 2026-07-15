import { requireCsrf, requireProfile } from "../../_lib/admin-auth";
import { confirmContentRelease } from "../../_lib/admin-content";
import {
  apiError,
  json,
  methodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from "../../_lib/http";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const session = await requireProfile(request, response, [
      "editor",
      "owner",
    ]);
    if (!session) return;
    requireCsrf(request, session);
    const id = Array.isArray(request.query?.id)
      ? request.query?.id[0]
      : request.query?.id;
    if (!id)
      return json(response, 400, {
        ok: false,
        error: "Release id is required.",
      });
    return json(response, 200, {
      ok: true,
      ...(await confirmContentRelease(session.profile, id)),
    });
  } catch (error) {
    return apiError(response, error, "Unable to confirm the content release.");
  }
}
