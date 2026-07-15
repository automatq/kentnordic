import { z } from "zod";

import { requireCsrf, requireProfile } from "../../_lib/admin-auth";
import { trashMedia, updateMedia } from "../../_lib/admin-media";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../../_lib/http";

const MediaPatch = z.object({
  alt: z.string().max(500).optional(),
  focalX: z.number().min(0).max(1).optional(),
  focalY: z.number().min(0).max(1).optional(),
  restore: z.boolean().optional(),
});

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["PATCH", "DELETE"].includes(request.method))
    return methodNotAllowed(response, ["PATCH", "DELETE"]);
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
      return json(response, 400, { ok: false, error: "Media id is required." });
    if (request.method === "DELETE") await trashMedia(session.profile, id);
    else
      await updateMedia(
        session.profile,
        id,
        MediaPatch.parse(await readRequestBody(request)),
      );
    return json(response, 200, { ok: true });
  } catch (error) {
    return apiError(response, error, "Unable to update media.");
  }
}
