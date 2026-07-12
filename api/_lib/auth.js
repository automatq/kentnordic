import crypto from "node:crypto";

import { json } from "./http.js";

const COOKIE_NAME = "idc_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

// Per-instance login throttle: 5 failures locks an IP out for 15 minutes.
// Lives in module memory, so it resets on cold start and isn't shared across
// concurrent serverless instances — a speed bump against casual brute
// forcing, not a substitute for a durable rate limiter.
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const loginAttempts = new Map();

export function checkLoginRateLimit(ip) {
  const entry = loginAttempts.get(ip);
  if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
    return { limited: true, retryAfterMs: entry.lockedUntil - Date.now() };
  }
  return { limited: false };
}

export function recordLoginFailure(ip) {
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    entry.count = 0;
  }
  loginAttempts.set(ip, entry);
}

export function recordLoginSuccess(ip) {
  loginAttempts.delete(ip);
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function getAdminSession(req) {
  if (!isAdminConfigured()) {
    return { authenticated: false, configured: false };
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return { authenticated: false, configured: true };

  const payload = verifySessionToken(token);
  if (!payload) return { authenticated: false, configured: true };

  return {
    authenticated: true,
    configured: true,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

export function requireAdmin(req, res) {
  const session = getAdminSession(req);
  if (session.authenticated) return session;

  if (!session.configured) {
    json(res, 503, {
      ok: false,
      error: "Admin access is not configured. Set ADMIN_PASSWORD first.",
      configured: false,
    });
    return null;
  }

  json(res, 401, { ok: false, error: "Admin authentication required." });
  return null;
}

export function loginAdmin(res) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const token = signSessionToken({ exp: expiresAt });

  res.setHeader(
    "Set-Cookie",
    serializeCookie(COOKIE_NAME, token, {
      maxAge: SESSION_TTL_SECONDS,
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.VERCEL === "1",
      path: "/",
    }),
  );

  return { expiresAt: new Date(expiresAt).toISOString() };
}

export function logoutAdmin(res) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(COOKIE_NAME, "", {
      maxAge: 0,
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.VERCEL === "1",
      path: "/",
    }),
  );
}

export function verifyAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const incoming = String(password || "");

  const left = Buffer.from(expected);
  const right = Buffer.from(incoming);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function signSessionToken(payload) {
  const body = base64url(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
}

function verifySessionToken(token) {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;
  if (!crypto.timingSafeEqual(left, right)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sign(value) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "local-admin-secret"
  );
}

function parseCookies(cookieHeader) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf("=");
      if (index === -1) return acc;
      const key = part.slice(0, index).trim();
      const value = decodeURIComponent(part.slice(index + 1));
      acc[key] = value;
      return acc;
    }, {});
}

function serializeCookie(name, value, options) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

function base64url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}
