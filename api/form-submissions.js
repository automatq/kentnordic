import {
  json,
  methodNotAllowed,
  readRequestBody,
  redirect,
  wantsHtml,
} from "./_lib/http.js";
import { normalizeInquirySubmission } from "./_lib/submissions.js";
import { getStorageDriver, saveSubmission } from "./_lib/storage.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const body = await readRequestBody(req);
    const normalized = normalizeInquirySubmission(body, req);

    if (!normalized.ok) {
      if (wantsHtml(req)) {
        return redirect(res, "/contact?error=validation#inquiry");
      }

      return json(res, 400, {
        ok: false,
        error: "Please correct the highlighted fields.",
        fields: normalized.errors,
      });
    }

    if (normalized.honeypot) {
      return json(res, 200, { ok: true, ignored: true });
    }

    const storage = await saveSubmission(normalized.submission);

    if (wantsHtml(req)) {
      return redirect(res, "/contact?submitted=1#inquiry");
    }

    return json(res, 200, {
      ok: true,
      id: normalized.submission.id,
      storageDriver: storage.driver,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to save the form submission right now.";

    return json(res, getStorageDriver() ? 500 : 503, {
      ok: false,
      error: message,
    });
  }
}
