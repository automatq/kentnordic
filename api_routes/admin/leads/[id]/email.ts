import { z } from "zod";

import { requireCsrf, requireProfile } from "../../../_lib/admin-auth.js";
import {
  retryLeadEmail,
  saveLeadEmailDraft,
  sendLeadEmail,
} from "../../../_lib/admin-email.js";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../../../_lib/http.js";

const EmailInput = z.union([
  z.object({
    action: z.enum(["send", "draft"]).default("send"),
    subject: z.string().trim().min(1).max(240),
    body: z.string().trim().min(1).max(30_000),
  }),
  z.object({
    action: z.literal("retry"),
    emailId: z.string().uuid(),
  }),
]);

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
    const input = EmailInput.parse(await readRequestBody(request));
    const message =
      input.action === "retry"
        ? await retryLeadEmail(session.profile, id, input.emailId)
        : input.action === "draft"
          ? await saveLeadEmailDraft(session.profile, id, input)
          : await sendLeadEmail(session.profile, id, input);
    return json(response, 201, { ok: true, message });
  } catch (error) {
    return apiError(response, error, "Unable to send the email.");
  }
}
