import { requireProfile } from "../_lib/admin-auth.js";
import { listMedia } from "../_lib/admin-media.js";
import {
  apiError,
  json,
  methodNotAllowed,
  requestUrl,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const session = await requireProfile(request, response, [
      "editor",
      "owner",
    ]);
    if (!session) return;
    const query = requestUrl(request).searchParams.get("q") || "";
    return json(response, 200, { ok: true, media: await listMedia(query) });
  } catch (error) {
    return apiError(response, error, "Unable to load media.");
  }
}
