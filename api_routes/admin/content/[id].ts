import { z } from "zod";

import { requireCsrf, requireProfile } from "../../_lib/admin-auth";
import { getContentEntry, saveContentDraft } from "../../_lib/admin-content";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../../_lib/http";

const ContentPatch = z.object({
  version: z.number().int().positive(),
  data: z.record(z.unknown()),
  note: z.string().max(500).optional(),
  title: z.string().trim().min(1).max(240).optional(),
  route: z.string().max(500).nullable().optional(),
});

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["GET", "PATCH"].includes(request.method))
    return methodNotAllowed(response, ["GET", "PATCH"]);
  try {
    const session = await requireProfile(request, response, [
      "editor",
      "owner",
    ]);
    if (!session) return;
    const id = Array.isArray(request.query?.id)
      ? request.query?.id[0]
      : request.query?.id;
    if (!id)
      return json(response, 400, {
        ok: false,
        error: "Content id is required.",
      });
    if (request.method === "GET") {
      const detail = await getContentEntry(id);
      return detail
        ? json(response, 200, { ok: true, detail })
        : json(response, 404, { ok: false, error: "Content entry not found." });
    }
    requireCsrf(request, session);
    const input = ContentPatch.parse(
      await readRequestBody(request, 512 * 1024),
    );
    const detail = await saveContentDraft(session.profile, id, input);
    return json(response, 200, { ok: true, detail });
  } catch (error) {
    return apiError(response, error, "Unable to save the content draft.");
  }
}
