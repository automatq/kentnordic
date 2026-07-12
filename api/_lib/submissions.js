import { getClientIp } from "./http.js";
import { createSubmissionId } from "./storage.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SUBMISSION_STATUSES = ["new", "contacted", "archived"];

export function normalizeInquirySubmission(body, req) {
  const data = {
    agency: clean(body.agency),
    contact: clean(body.contact),
    email: clean(body.email),
    phone: clean(body.phone),
    country: clean(body.country),
    packageCode: clean(body.packageCode),
    travelDates: clean(body.travelDates),
    pax: clean(body.pax),
    groupType: clean(body.groupType),
    message: clean(body.message),
    consent: clean(body.consent),
    sourcePage: clean(body.sourcePage),
    honeypot: clean(body.botField || body.company_website),
  };

  const errors = {};
  if (!data.agency) errors.agency = "Agency / company is required.";
  if (!data.contact) errors.contact = "Contact name is required.";
  if (!data.email) errors.email = "Work email is required.";
  if (data.email && !EMAIL_RE.test(data.email))
    errors.email = "Enter a valid email address.";
  if (!data.message) errors.message = "Message is required.";
  if (data.consent !== "yes") errors.consent = "Consent is required.";

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  const createdAt = new Date().toISOString();
  const packageLabel = data.packageCode || "General inquiry";
  // RateSheetForm posts through this same endpoint with synthetic fields —
  // it tags its sourcePage with a #rate-sheet suffix so the admin inbox can
  // tell the two kinds of submission apart.
  const formType = data.sourcePage.endsWith("#rate-sheet")
    ? "rate-sheet"
    : "inquiry";

  return {
    ok: true,
    submission: {
      id: createSubmissionId(),
      formType,
      createdAt,
      status: "new",
      summary: `${data.agency} — ${packageLabel}`,
      sourcePage: data.sourcePage || "—",
      contact: {
        name: data.contact,
        email: data.email,
        phone: data.phone || "",
        country: data.country || "",
      },
      fields: {
        "Agency / company": data.agency,
        "Contact name": data.contact,
        "Work email": data.email,
        Phone: data.phone || "—",
        "Country / market": data.country || "—",
        "Package of interest": packageLabel,
        "Preferred travel dates": data.travelDates || "—",
        "Group size (pax)": data.pax || "—",
        "Type of travel": data.groupType || "Not sure yet",
        Message: data.message,
      },
      meta: {
        ipAddress: clean(getClientIp(req)) || "—",
        referer: clean(req.headers.referer) || "—",
        userAgent: clean(req.headers["user-agent"]) || "—",
      },
    },
    honeypot: data.honeypot,
  };
}

function clean(value) {
  return String(value || "").trim();
}
