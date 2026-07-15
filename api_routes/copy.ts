import { readLegacyCopyOverrides } from "./_lib/legacy-storage";
import {
  apiError,
  methodNotAllowed,
  type ApiRequest,
  type ApiResponse,
} from "./_lib/http";

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  try {
    const overrides = await readLegacyCopyOverrides();
    response.status(200);
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader(
      "Cache-Control",
      "public, max-age=10, stale-while-revalidate=30",
    );
    response.send(JSON.stringify(overrides));
  } catch (error) {
    return apiError(response, error, "Unable to load legacy copy overrides.");
  }
}
