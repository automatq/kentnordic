import { z } from "zod";

import { requireCsrf, requireProfile } from "../../_lib/admin-auth";
import { resetCopyDraft, saveCopyDraft } from "../../_lib/admin-content";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../../_lib/http";

const CopyInput = z.object({ value: z.string().max(30_000) });

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["PUT", "DELETE"].includes(request.method))
    return methodNotAllowed(response, ["PUT", "DELETE"]);
  try {
    const session = await requireProfile(request, response, [
      "editor",
      "owner",
    ]);
    if (!session) return;
    requireCsrf(request, session);
    const key = Array.isArray(request.query?.key)
      ? request.query?.key[0]
      : request.query?.key;
    if (!key)
      return json(response, 400, { ok: false, error: "Copy key is required." });
    const result =
      request.method === "PUT"
        ? await saveCopyDraft(
            session.profile,
            key,
            CopyInput.parse(await readRequestBody(request)).value,
          )
        : await resetCopyDraft(session.profile, key);
    return json(response, 200, { ok: true, draft: result });
  } catch (error) {
    return apiError(response, error, "Unable to save the copy draft.");
  }
}
