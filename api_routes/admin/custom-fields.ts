import { z } from "zod";

import { requireCsrf, requireProfile } from "../_lib/admin-auth.js";
import { listCustomFields, saveCustomField } from "../_lib/admin-settings.js";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";

const FieldInput = z.object({
  id: z.string().uuid().optional(),
  entity: z.enum(["lead", "contact", "organization"]),
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{1,48}$/),
  label: z.string().trim().min(1).max(120),
  type: z.enum([
    "text",
    "number",
    "date",
    "boolean",
    "url",
    "single-select",
    "multi-select",
  ]),
  options: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  required: z.boolean().default(false),
  position: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (!request.method || !["GET", "POST"].includes(request.method))
    return methodNotAllowed(response, ["GET", "POST"]);
  try {
    const session = await requireProfile(
      request,
      response,
      request.method === "GET" ? ["sales", "owner"] : ["owner"],
    );
    if (!session) return;
    if (request.method === "GET")
      return json(response, 200, {
        ok: true,
        fields: await listCustomFields(),
      });
    requireCsrf(request, session);
    await saveCustomField(
      session.profile,
      FieldInput.parse(await readRequestBody(request)),
    );
    return json(response, 201, { ok: true });
  } catch (error) {
    return apiError(response, error, "Unable to save the custom field.");
  }
}
