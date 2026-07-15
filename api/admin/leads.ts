import { requireProfile } from "../_lib/admin-auth";
import { listLeads } from "../_lib/admin-crm";
import {
  apiError,
  json,
  methodNotAllowed,
  requestUrl,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const session = await requireProfile(request, response, ["sales", "owner"]);
    if (!session) return;
    const search = requestUrl(request).searchParams;
    const page = await listLeads({
      query: search.get("q") || undefined,
      stageId: search.get("stage") || undefined,
      ownerId: search.get("owner") || undefined,
      priority: search.get("priority") || undefined,
      source: search.get("source") || undefined,
      formType: search.get("formType") || undefined,
      country: search.get("country") || undefined,
      packageCode: search.get("packageCode") || undefined,
      travelDates: search.get("travelDates") || undefined,
      customFieldKey: search.get("customFieldKey") || undefined,
      customFieldValue: search.get("customFieldValue") || undefined,
      due:
        (search.get("due") as "overdue" | "today" | "upcoming" | null) ||
        undefined,
      cursor: search.get("cursor") || undefined,
      limit: Number(search.get("limit") || 50),
    });
    return json(response, 200, { ok: true, page });
  } catch (error) {
    return apiError(response, error, "Unable to load leads.");
  }
}
