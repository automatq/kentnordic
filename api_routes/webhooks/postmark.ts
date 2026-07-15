import crypto from "node:crypto";

import { processPostmarkEvent } from "../_lib/admin-email.js";
import {
  HttpError,
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    verifyBasicAuth(String(request.headers.authorization || ""));
    const body = await readRequestBody(request, 256 * 1024);
    await processPostmarkEvent(body);
    return json(response, 200, { ok: true });
  } catch (error) {
    return apiError(response, error, "Unable to process the Postmark event.");
  }
}

function verifyBasicAuth(header: string) {
  const user = process.env.POSTMARK_WEBHOOK_USER || "";
  const password = process.env.POSTMARK_WEBHOOK_PASSWORD || "";
  if (!user || !password)
    throw new HttpError(
      503,
      "Postmark webhook authentication is not configured.",
    );
  if (!header.startsWith("Basic "))
    throw new HttpError(401, "Webhook authentication required.");
  const incoming = Buffer.from(header.slice(6), "base64").toString("utf8");
  const expected = `${user}:${password}`;
  const left = Buffer.from(incoming);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw new HttpError(401, "Invalid webhook authentication.");
  }
}
