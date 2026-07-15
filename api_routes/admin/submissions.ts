import { requireProfile } from "../_lib/admin-auth";
import {
  legacyStorageDriver,
  listLegacySubmissions,
} from "../_lib/legacy-storage";
import {
  apiError,
  json,
  methodNotAllowed,
  requestUrl,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";

// Kept read-only during the 30-day migration window as an emergency audit view.
export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const session = await requireProfile(request, response, ["owner"]);
    if (!session) return;
    const rawLimit = Number(
      requestUrl(request).searchParams.get("limit") || 100,
    );
    const submissions = await listLegacySubmissions(
      Number.isFinite(rawLimit) ? Math.min(1000, Math.max(1, rawLimit)) : 100,
    );
    return json(response, 200, {
      ok: true,
      readOnly: true,
      storageDriver: legacyStorageDriver(),
      submissions,
    });
  } catch (error) {
    return apiError(response, error, "Unable to load legacy submissions.");
  }
}
