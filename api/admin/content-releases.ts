import { z } from "zod";

import { requireCsrf, requireProfile } from "../_lib/admin-auth";
import { listContentReleases, publishContent } from "../_lib/admin-content";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";

const PublishInput = z.object({ note: z.string().trim().max(500).default("") });

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["GET", "POST"].includes(request.method))
    return methodNotAllowed(response, ["GET", "POST"]);
  try {
    const session = await requireProfile(request, response, [
      "editor",
      "owner",
    ]);
    if (!session) return;
    if (request.method === "GET") {
      return json(response, 200, {
        ok: true,
        releases: await listContentReleases(),
      });
    }
    requireCsrf(request, session);
    const input = PublishInput.parse(await readRequestBody(request));
    const release = await publishContent(session.profile, input.note);
    return json(response, 201, { ok: true, release });
  } catch (error) {
    return apiError(response, error, "Unable to publish content.");
  }
}
