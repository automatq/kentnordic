import { requireProfile } from "../_lib/admin-auth.js";
import { exportLeadsCsv } from "../_lib/admin-crm.js";
import {
  apiError,
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
    const session = await requireProfile(request, response, ["sales", "owner"]);
    if (!session) return;
    const search = requestUrl(request).searchParams;
    const csv = await exportLeadsCsv(
      {
        query: search.get("q") || undefined,
        stageId: search.get("stage") || undefined,
        ownerId: search.get("owner") || undefined,
        priority: search.get("priority") || undefined,
        source: search.get("source") || undefined,
        formType: search.get("formType") || undefined,
        country: search.get("country") || undefined,
        packageCode: search.get("packageCode") || undefined,
        travelDates: search.get("travelDates") || undefined,
        due:
          (search.get("due") as "overdue" | "today" | "upcoming" | null) ||
          undefined,
        customFieldKey: search.get("customFieldKey") || undefined,
        customFieldValue: search.get("customFieldValue") || undefined,
      },
      session.profile,
    );
    response.status(200);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    response.setHeader("Cache-Control", "private, no-store");
    response.send(csv);
  } catch (error) {
    return apiError(response, error, "Unable to export leads.");
  }
}
