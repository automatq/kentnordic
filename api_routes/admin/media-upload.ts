import crypto from "node:crypto";

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";

import { requireCsrf, requireProfile } from "../_lib/admin-auth.js";
import {
  registerAndProcessUpload,
  type UploadTokenPayload,
} from "../_lib/admin-media.js";
import {
  apiError,
  json,
  methodNotAllowed,
  readRequestBody,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";

const ClientPayload = z.object({
  alt: z.string().trim().min(1).max(500),
  filename: z.string().trim().min(1).max(240),
});

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const body = (await readRequestBody(
      request,
      64 * 1024,
    )) as unknown as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await requireProfile(request, response, [
          "editor",
          "owner",
        ]);
        if (!session) throw new Error("Admin profile required.");
        requireCsrf(request, session);
        const input = ClientPayload.parse(JSON.parse(clientPayload || "{}"));
        const payload: UploadTokenPayload = {
          assetId: crypto.randomUUID(),
          profileId: session.profile.id,
          alt: input.alt,
          filename: input.filename,
        };
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
          ],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify(payload),
          callbackUrl: `${request.headers["x-forwarded-proto"] || "https"}://${request.headers.host}/api/admin/media-upload`,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload || "{}") as UploadTokenPayload;
        await registerAndProcessUpload({ blob, payload });
      },
    });
    return json(response, 200, result);
  } catch (error) {
    return apiError(response, error, "Unable to upload the image.");
  }
}
