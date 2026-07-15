import { requireProfile } from "../_lib/admin-auth.js";
import { listContentEntries } from "../_lib/admin-content.js";
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
    const search = requestUrl(request).searchParams;
    const entries = await listContentEntries({
      kind: search.get("kind") || undefined,
      query: search.get("q") || undefined,
      changedOnly: search.get("changed") === "true",
    });
    return json(response, 200, { ok: true, entries });
  } catch (error) {
    return apiError(response, error, "Unable to load content.");
  }
}
