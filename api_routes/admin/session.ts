import { databaseDriver, getAdminSession } from "../_lib/admin-auth";
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
    const session = await getAdminSession(request);
    return json(response, 200, {
      ...session,
      adminV2Enabled: process.env.ADMIN_V2_ENABLED !== "false",
      databaseDriver: databaseDriver(),
    });
  } catch (error) {
    return apiError(response, error, "Unable to load the admin session.");
  }
}
