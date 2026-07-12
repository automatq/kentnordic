import { requireAdmin } from "../../_lib/auth.js";
import { json, methodNotAllowed, readRequestBody } from "../../_lib/http.js";
import { SUBMISSION_STATUSES } from "../../_lib/submissions.js";
import {
  deleteSubmission,
  getStorageDriver,
  updateSubmissionStatus,
} from "../../_lib/storage.js";

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (!["PATCH", "DELETE"].includes(req.method || "")) {
    return methodNotAllowed(res, ["PATCH", "DELETE"]);
  }

  if (!requireAdmin(req, res)) return;

  const id = String(req.query?.id || "").trim();
  if (!ID_RE.test(id)) {
    return json(res, 400, { ok: false, error: "Invalid submission id." });
  }

  try {
    if (req.method === "DELETE") {
      const deleted = await deleteSubmission(id);
      if (!deleted) {
        return json(res, 404, { ok: false, error: "Submission not found." });
      }
      return json(res, 200, { ok: true, id, deleted: true });
    }

    const body = await readRequestBody(req);
    const status = String(body.status || "");
    if (!SUBMISSION_STATUSES.includes(status)) {
      return json(res, 400, {
        ok: false,
        error: `status must be one of: ${SUBMISSION_STATUSES.join(", ")}`,
      });
    }

    const submission = await updateSubmissionStatus(id, status);
    if (!submission) {
      return json(res, 404, { ok: false, error: "Submission not found." });
    }
    return json(res, 200, { ok: true, id, submission });
  } catch (error) {
    return json(res, getStorageDriver() ? 500 : 503, {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to update submission.",
    });
  }
}
