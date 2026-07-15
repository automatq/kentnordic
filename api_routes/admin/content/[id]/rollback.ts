import { z } from "zod";

import { requireCsrf, requireProfile } from "../../../_lib/admin-auth";
import { rollbackContentDraft } from "../../../_lib/admin-content";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../../../_lib/http";

const RollbackInput = z.object({ revisionId: z.string().uuid() });

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
        error: "Content id is required.",
      });
    const input = RollbackInput.parse(await readRequestBody(request));
    return json(response, 200, {
      ok: true,
      detail: await rollbackContentDraft(session.profile, id, input.revisionId),
    });
  } catch (error) {
    return apiError(response, error, "Unable to restore that revision.");
  }
}
