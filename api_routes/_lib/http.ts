import type { IncomingMessage, ServerResponse } from "node:http";

export interface ApiRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[]>;
  cookies?: Record<string, string>;
}

export interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse;
  send(body: string): void;
}

export async function readRequestBody(
  request: ApiRequest,
  maxBytes = 64 * 1024,
): Promise<Record<string, unknown>> {
  if (
    request.body &&
    typeof request.body === "object" &&
    !Buffer.isBuffer(request.body)
  ) {
    const serialized = JSON.stringify(request.body);
    if (Buffer.byteLength(serialized) > maxBytes) throw payloadTooLarge();
    return request.body as Record<string, unknown>;
  }

  if (typeof request.body === "string" || Buffer.isBuffer(request.body)) {
    const buffer = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(request.body, "utf8");
    if (buffer.length > maxBytes) throw payloadTooLarge();
    return parseBody(
      buffer.toString("utf8"),
      request.headers["content-type"] || "",
    );
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const part = Buffer.from(chunk);
    total += part.length;
    if (total > maxBytes) throw payloadTooLarge();
    chunks.push(part);
  }
  return parseBody(
    Buffer.concat(chunks).toString("utf8"),
    request.headers["content-type"] || "",
  );
}

export function json(response: ApiResponse, status: number, payload: unknown) {
  response.status(status);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store");
  response.send(JSON.stringify(payload));
}

export function methodNotAllowed(response: ApiResponse, methods: string[]) {
  response.setHeader("Allow", methods.join(", "));
  return json(response, 405, {
    ok: false,
    error: `Method not allowed. Use ${methods.join(" or ")}.`,
  });
}

export function requestUrl(request: ApiRequest) {
  const proto = request.headers["x-forwarded-proto"] || "http";
  const host = request.headers.host || "localhost";
  return new URL(request.url || "/", `${proto}://${host}`);
}

export function wantsHtml(request: ApiRequest) {
  return String(request.headers.accept || "").includes("text/html");
}

export function redirect(
  response: ApiResponse,
  location: string,
  status = 303,
) {
  response.status(status);
  response.setHeader("Location", location);
  response.end();
}

export function getClientIp(request: ApiRequest) {
  const forwarded = request.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) return forwarded[0] || "";
  if (typeof forwarded === "string")
    return forwarded.split(",")[0]?.trim() || "";
  return request.socket.remoteAddress || "";
}

export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  return (header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const index = part.indexOf("=");
      if (index === -1) return cookies;
      cookies[part.slice(0, index)] = decodeURIComponent(part.slice(index + 1));
      return cookies;
    }, {});
}

export function serializeCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    httpOnly?: boolean;
    sameSite?: "Strict" | "Lax";
    secure?: boolean;
    path?: string;
  },
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function apiError(
  response: ApiResponse,
  error: unknown,
  fallback = "Something went wrong.",
) {
  const status =
    error instanceof HttpError
      ? error.status
      : error instanceof SyntaxError
        ? 400
        : 500;
  const message =
    error instanceof HttpError || error instanceof SyntaxError
      ? error.message
      : process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : fallback;
  return json(response, status, { ok: false, error: message });
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function parseBody(text: string, contentType: string): Record<string, unknown> {
  if (!text) return {};
  if (contentType.includes("application/json")) {
    return JSON.parse(text) as Record<string, unknown>;
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  throw new HttpError(415, "Use application/json or form-encoded data.");
}

function payloadTooLarge() {
  return new HttpError(413, "Payload is larger than 64 KB.");
}
