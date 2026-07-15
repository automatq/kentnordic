import { z } from "zod";

import { requireCsrf, requireProfile } from "../../../_lib/admin-auth";
import { addLeadEvent } from "../../../_lib/admin-crm";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../../../_lib/http";

const EventInput = z.object({
  type: z.enum(["note", "call"]),
  body: z.string().trim().min(1).max(12_000),
});

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const session = await requireProfile(request, response, ["sales", "owner"]);
    if (!session) return;
    requireCsrf(request, session);
    const id = Array.isArray(request.query?.id)
      ? request.query?.id[0]
      : request.query?.id;
    if (!id)
      return json(response, 400, { ok: false, error: "Lead id is required." });
    const input = EventInput.parse(await readRequestBody(request));
    await addLeadEvent(session.profile, id, input.type, input.body);
    return json(response, 201, { ok: true });
  } catch (error) {
    return apiError(response, error, "Unable to add the activity.");
  }
}
