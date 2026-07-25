import crypto from "node:crypto";

import { InquiryInputSchema } from "../shared/admin-contracts.js";
import { formTypeFromSourcePage } from "../shared/form-type.js";
import {
  checkIntakeRateLimit,
  createLeadFromInquiry,
} from "./_lib/admin-crm.js";
import {
  saveLegacySubmission,
  type LegacySubmission,
} from "./_lib/legacy-storage.js";
import {
  HttpError,
  apiError,
  getClientIp,
  json,
  methodNotAllowed,
  readRequestBody,
  redirect,
  wantsHtml,
  type ApiRequest,
  type ApiResponse,
} from "./_lib/http.js";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    if (
      !String(request.headers["content-type"] || "").includes(
        "application/json",
      ) &&
      !wantsHtml(request)
    ) {
      throw new HttpError(415, "Use application/json.");
    }
    const body = await readRequestBody(request, 64 * 1024);
    const parsed = InquiryInputSchema.safeParse(body);
    if (!parsed.success) {
      if (wantsHtml(request))
        return redirect(response, "/contact?error=validation#inquiry");
      const fields = Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0] || "form"),
          issue.message,
        ]),
      );
      return json(response, 400, {
        ok: false,
        error: "Please correct the highlighted fields.",
        fields,
      });
    }

    if (parsed.data.botField || parsed.data.company_website) {
      return json(response, 200, { ok: true, ignored: true });
    }

    const ipHash = hmacIp(getClientIp(request));
    await checkIntakeRateLimit(ipHash);
    const idempotencyKey =
      String(request.headers["idempotency-key"] || "").trim() ||
      crypto.randomUUID();
    if (idempotencyKey.length > 200)
      throw new HttpError(400, "Invalid idempotency key.");

    if (process.env.ADMIN_V2_ENABLED === "false") {
      const id = deterministicUuid(idempotencyKey);
      const formType = formTypeFromSourcePage(parsed.data.sourcePage);
      const packageLabel = parsed.data.packageCode || "General inquiry";
      const submission: LegacySubmission = {
        id,
        formType,
        createdAt: new Date().toISOString(),
        status: "new",
        summary: `${parsed.data.agency} — ${packageLabel}`,
        sourcePage: parsed.data.sourcePage || "—",
        contact: {
          name: parsed.data.contact,
          email: parsed.data.email,
          phone: parsed.data.phone,
          country: parsed.data.country,
        },
        fields: {
          "Agency / company": parsed.data.agency,
          "Contact name": parsed.data.contact,
          "Work email": parsed.data.email,
          Phone: parsed.data.phone || "—",
          "Country / market": parsed.data.country || "—",
          "Package of interest": packageLabel,
          "Preferred travel dates": parsed.data.travelDates || "—",
          "Group size (pax)": parsed.data.pax || "—",
          "Type of travel": parsed.data.groupType || "Not sure yet",
          Message: parsed.data.message,
        },
        meta: {
          referer: String(request.headers.referer || ""),
          userAgent: String(request.headers["user-agent"] || ""),
          consentVersion: parsed.data.consentVersion,
          utmSource: parsed.data.utmSource,
          utmMedium: parsed.data.utmMedium,
          utmCampaign: parsed.data.utmCampaign,
        },
      };
      const storage = await saveLegacySubmission(submission);
      if (wantsHtml(request))
        return redirect(response, "/contact?submitted=1#inquiry");
      return json(response, 200, {
        ok: true,
        id,
        legacy: true,
        storageDriver: storage.driver,
      });
    }

    const result = await createLeadFromInquiry({
      input: parsed.data,
      idempotencyKey,
      ipHash,
      referer: String(request.headers.referer || ""),
      userAgent: String(request.headers["user-agent"] || ""),
    });

    if (wantsHtml(request))
      return redirect(response, "/contact?submitted=1#inquiry");
    return json(response, 200, result);
  } catch (error) {
    if (wantsHtml(request))
      return redirect(response, "/contact?error=server#inquiry");
    return apiError(response, error, "Unable to save the inquiry right now.");
  }
}

function deterministicUuid(value: string) {
  const hex = crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16] || "0", 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function hmacIp(ip: string) {
  return crypto
    .createHmac(
      "sha256",
      process.env.ADMIN_SESSION_SECRET ||
        process.env.ADMIN_PASSWORD ||
        "local-intake-secret",
    )
    .update(ip || "unknown")
    .digest("hex");
}
