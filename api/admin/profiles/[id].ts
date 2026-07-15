import { ProfileUpdateSchema } from "../../../shared/admin-contracts";
import {
  requireCsrf,
  requireProfile,
  updateProfile,
} from "../../_lib/admin-auth";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../../_lib/http";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "PATCH") return methodNotAllowed(response, ["PATCH"]);
  try {
    const session = await requireProfile(request, response);
    if (!session) return;
    requireCsrf(request, session);
    const id = Array.isArray(request.query?.id)
      ? request.query?.id[0]
      : request.query?.id;
    if (!id)
      return json(response, 400, {
        ok: false,
        error: "Profile id is required.",
      });
    const input = ProfileUpdateSchema.parse(await readRequestBody(request));
    await updateProfile(session.profile, id, {
      ...input,
      email: input.email === "" ? null : input.email,
    });
    return json(response, 200, { ok: true });
  } catch (error) {
    return apiError(response, error, "Unable to update the profile.");
  }
}
