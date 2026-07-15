import { LeadPatchSchema } from "../../../shared/admin-contracts";
import { requireCsrf, requireProfile } from "../../_lib/admin-auth";
import { getLeadDetail, trashLead, updateLead } from "../../_lib/admin-crm";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../../_lib/http";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["GET", "PATCH", "DELETE"].includes(request.method)) {
    return methodNotAllowed(response, ["GET", "PATCH", "DELETE"]);
  }
  try {
    const session = await requireProfile(request, response, ["sales", "owner"]);
    if (!session) return;
    const id = Array.isArray(request.query?.id)
      ? request.query?.id[0]
      : request.query?.id;
    if (!id)
      return json(response, 400, { ok: false, error: "Lead id is required." });
    if (request.method === "GET") {
      const detail = await getLeadDetail(id);
      return detail
        ? json(response, 200, { ok: true, detail })
        : json(response, 404, { ok: false, error: "Lead not found." });
    }
    requireCsrf(request, session);
    if (request.method === "DELETE") {
      await trashLead(session.profile, id);
      return json(response, 200, { ok: true });
    }
    const patch = LeadPatchSchema.parse(await readRequestBody(request));
    return json(response, 200, {
      ok: true,
      lead: await updateLead(session.profile, id, patch),
    });
  } catch (error) {
    return apiError(response, error, "Unable to update the lead.");
  }
}
