import crypto from "node:crypto";

import { runNotificationJobs } from "../_lib/admin-notification-jobs";
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
    const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
    const incoming = String(request.headers.authorization || "");
    if (!process.env.CRON_SECRET || !safeEqual(incoming, expected))
      return json(response, 401, {
        ok: false,
        error: "Cron authorization required.",
      });
    return json(response, 200, { ok: true, ...(await runNotificationJobs()) });
  } catch (error) {
    return apiError(response, error, "Notification job failed.");
  }
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
