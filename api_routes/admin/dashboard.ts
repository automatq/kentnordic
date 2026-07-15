import { requireProfile } from "../_lib/admin-auth";
import { getDashboard } from "../_lib/admin-crm";
import {
  apiError,
  json,
  methodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const session = await requireProfile(request, response);
    if (!session) return;
    const dashboard = await getDashboard(session.profile);
    if (
      !session.profile.roles.some(
        (role) => role === "sales" || role === "owner",
      )
    ) {
      dashboard.counts.newLeads = 0;
      dashboard.counts.unassignedLeads = 0;
      dashboard.counts.overdueTasks = 0;
      dashboard.counts.failedEmails = 0;
      dashboard.recentLeads = [];
      dashboard.upcomingTasks = [];
      dashboard.recentActivity = [];
    }
    return json(response, 200, { ok: true, dashboard });
  } catch (error) {
    return apiError(response, error, "Unable to load the dashboard.");
  }
}
