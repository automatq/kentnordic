import { z } from "zod";

import { requireCsrf, requireProfile } from "../_lib/admin-auth.js";
import { listSavedViews, saveView } from "../_lib/admin-settings.js";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";

const ViewInput = z.object({
  name: z.string().trim().min(1).max(80),
  filters: z.record(z.unknown()),
  columns: z.array(z.string()).max(30),
  sort: z.string().max(80),
});

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["GET", "POST"].includes(request.method))
    return methodNotAllowed(response, ["GET", "POST"]);
  try {
    const session = await requireProfile(request, response, ["sales", "owner"]);
    if (!session) return;
    if (request.method === "GET")
      return json(response, 200, {
        ok: true,
        views: await listSavedViews(session.profile.id),
      });
    requireCsrf(request, session);
    await saveView(
      session.profile.id,
      ViewInput.parse(await readRequestBody(request)),
    );
    return json(response, 201, { ok: true });
  } catch (error) {
    return apiError(response, error, "Unable to save the view.");
  }
}
