import crypto from "node:crypto";
import { promisify } from "node:util";

import type {
  AdminProfile,
  AdminSession,
  ProfileRole,
} from "../../shared/admin-contracts.js";
import {
  databaseDriver,
  isDatabaseConfigured,
  withDatabase,
} from "./database.js";
import {
  HttpError,
  getClientIp,
  json,
  parseCookies,
  serializeCookie,
  type ApiRequest,
  type ApiResponse,
} from "./http.js";

const GATEWAY_COOKIE = "idc_admin_gateway";
const PROFILE_COOKIE = "idc_admin_profile";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const scrypt = promisify(crypto.scrypt);
const PROFILE_COLORS = ["#315D70", "#246B62", "#8E5270", "#8A6635", "#56647A"];

interface ProfileRow extends Record<string, unknown> {
  id: string;
  name: string;
  email: string | null;
  color: string;
  active: boolean;
  created_at: Date | string;
  last_seen_at: Date | string | null;
  roles: ProfileRole[] | null;
}

interface ProfileSessionRow extends ProfileRow {
  csrf_token: string;
  expires_at: Date | string;
  password_version: string;
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function getAdminSession(
  request: ApiRequest,
): Promise<AdminSession> {
  const configured = isAdminConfigured();
  const databaseConfigured = isDatabaseConfigured();
  if (!configured) {
    return {
      authenticated: false,
      gatewayAuthenticated: false,
      configured: false,
      databaseConfigured,
      profile: null,
    };
  }

  const cookies = parseCookies(request.headers.cookie);
  const gatewayAuthenticated = Boolean(
    verifyGatewayToken(cookies[GATEWAY_COOKIE]),
  );
  if (
    !gatewayAuthenticated ||
    !databaseConfigured ||
    !cookies[PROFILE_COOKIE]
  ) {
    return {
      authenticated: false,
      gatewayAuthenticated,
      configured,
      databaseConfigured,
      profile: null,
    };
  }

  const tokenHash = hash(cookies[PROFILE_COOKIE]);
  const rows = await withDatabase((database) =>
    database.query<ProfileSessionRow>(
      `
        SELECT p.id, p.name, p.email, p.color, p.active, p.created_at,
          p.last_seen_at, s.csrf_token, s.expires_at, s.password_version,
          COALESCE(array_agg(pr.role) FILTER (WHERE pr.role IS NOT NULL), '{}') AS roles
        FROM admin_profile_sessions s
        JOIN admin_profiles p ON p.id = s.profile_id
        LEFT JOIN admin_profile_roles pr ON pr.profile_id = p.id
        WHERE s.token_hash = $1 AND s.expires_at > now()
        GROUP BY p.id, s.csrf_token, s.expires_at, s.password_version
      `,
      [tokenHash],
    ),
  );
  const row = rows[0];
  if (!row || !row.active || row.password_version !== passwordVersion()) {
    return {
      authenticated: false,
      gatewayAuthenticated,
      configured,
      databaseConfigured,
      profile: null,
    };
  }

  return {
    authenticated: true,
    gatewayAuthenticated: true,
    configured: true,
    databaseConfigured: true,
    profile: mapProfile(row),
    csrfToken: row.csrf_token,
    expiresAt: iso(row.expires_at),
  };
}

export async function requireProfile(
  request: ApiRequest,
  response: ApiResponse,
  roles?: ProfileRole[],
) {
  const session = await getAdminSession(request);
  if (!session.authenticated || !session.profile) {
    json(response, 401, {
      ok: false,
      error: "Choose and unlock an admin profile.",
    });
    return null;
  }
  if (roles && !roles.some((role) => session.profile!.roles.includes(role))) {
    json(response, 403, {
      ok: false,
      error: "This profile does not have access.",
    });
    return null;
  }
  return session as AdminSession & { profile: AdminProfile; csrfToken: string };
}

export function requireCsrf(request: ApiRequest, session: AdminSession) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method || "GET")) return;
  const token = request.headers["x-admin-csrf"];
  if (
    typeof token !== "string" ||
    !session.csrfToken ||
    !safeEqual(token, session.csrfToken)
  ) {
    throw new HttpError(
      403,
      "Your admin session changed. Refresh and try again.",
    );
  }
}

export async function loginGateway(
  request: ApiRequest,
  response: ApiResponse,
  password: string,
) {
  if (!isAdminConfigured())
    throw new HttpError(503, "Set ADMIN_PASSWORD first.");
  if (!isDatabaseConfigured())
    throw new HttpError(503, "Connect Neon and set DATABASE_URL.");

  const rateKey = `gateway:${clientHash(request)}`;
  await assertNotRateLimited(rateKey);
  if (!safeEqual(String(password || ""), process.env.ADMIN_PASSWORD || "")) {
    await recordFailure(rateKey, 5);
    throw new HttpError(401, "Incorrect workspace password.");
  }
  await clearFailures(rateKey);

  response.setHeader(
    "Set-Cookie",
    serializeCookie(GATEWAY_COOKIE, signGatewayToken(), cookieOptions()),
  );
  return {
    authenticated: true,
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
  };
}

export async function listProfiles(): Promise<AdminProfile[]> {
  const rows = await withDatabase((database) =>
    database.query<ProfileRow>(`
      SELECT p.id, p.name, p.email, p.color, p.active, p.created_at, p.last_seen_at,
        COALESCE(array_agg(pr.role) FILTER (WHERE pr.role IS NOT NULL), '{}') AS roles
      FROM admin_profiles p
      LEFT JOIN admin_profile_roles pr ON pr.profile_id = p.id
      GROUP BY p.id
      ORDER BY p.active DESC, lower(p.name)
    `),
  );
  return rows.map(mapProfile);
}

export async function createProfile(
  name: string,
  pin: string,
): Promise<AdminProfile> {
  const normalized = normalize(name);
  const salt = crypto.randomBytes(16).toString("hex");
  const pinHash = await hashPin(pin, salt);
  const id = crypto.randomUUID();

  return withDatabase(
    async (database) => {
      await database.query(
        `LOCK TABLE admin_profiles IN SHARE ROW EXCLUSIVE MODE`,
      );
      const count = await database.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM admin_profiles`,
      );
      const role: ProfileRole =
        Number(count[0]?.count || 0) === 0 ? "owner" : "sales";
      const color =
        PROFILE_COLORS[Math.abs(hashCode(normalized)) % PROFILE_COLORS.length];

      try {
        await database.query(
          `INSERT INTO admin_profiles
          (id, name, normalized_name, color, pin_salt, pin_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, name.trim(), normalized, color, salt, pinHash],
        );
        await database.query(
          `INSERT INTO admin_profile_roles (profile_id, role) VALUES ($1, $2)`,
          [id, role],
        );
        await database.query(
          `INSERT INTO notification_preferences (profile_id) VALUES ($1)`,
          [id],
        );
        await audit(database, id, "profile.created", "profile", id, { role });
      } catch (error) {
        if (isUniqueViolation(error))
          throw new HttpError(409, "That profile name is already in use.");
        throw error;
      }

      const rows = await database.query<ProfileRow>(
        `SELECT p.id, p.name, p.email, p.color, p.active, p.created_at, p.last_seen_at,
        ARRAY[$2::profile_role] AS roles FROM admin_profiles p WHERE p.id = $1`,
        [id, role],
      );
      return mapProfile(rows[0]!);
    },
    { transaction: true },
  );
}

export async function unlockProfile(
  request: ApiRequest,
  response: ApiResponse,
  profileId: string,
  pin: string,
) {
  const rateKey = `pin:${profileId}:${clientHash(request)}`;
  await assertNotRateLimited(rateKey);
  const rows = await withDatabase((database) =>
    database.query<ProfileRow & { pin_salt: string; pin_hash: string }>(
      `SELECT p.id, p.name, p.email, p.color, p.active, p.created_at, p.last_seen_at,
        p.pin_salt, p.pin_hash,
        COALESCE(array_agg(pr.role) FILTER (WHERE pr.role IS NOT NULL), '{}') AS roles
       FROM admin_profiles p
       LEFT JOIN admin_profile_roles pr ON pr.profile_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [profileId],
    ),
  );
  const profile = rows[0];
  if (
    !profile ||
    !profile.active ||
    !(await verifyPin(pin, profile.pin_salt, profile.pin_hash))
  ) {
    await recordFailure(rateKey, 5);
    throw new HttpError(401, "Incorrect PIN or inactive profile.");
  }
  await clearFailures(rateKey);

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const csrfToken = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await withDatabase(
    async (database) => {
      await database.query(
        `INSERT INTO admin_profile_sessions
        (token_hash, profile_id, password_version, csrf_token, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
        [hash(rawToken), profile.id, passwordVersion(), csrfToken, expiresAt],
      );
      await database.query(
        `UPDATE admin_profiles SET last_seen_at = now(), updated_at = now() WHERE id = $1`,
        [profile.id],
      );
    },
    { transaction: true },
  );

  response.setHeader(
    "Set-Cookie",
    serializeCookie(PROFILE_COOKIE, rawToken, cookieOptions()),
  );
  return {
    profile: mapProfile({ ...profile, last_seen_at: new Date() }),
    csrfToken,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function lockProfile(request: ApiRequest, response: ApiResponse) {
  const cookies = parseCookies(request.headers.cookie);
  if (cookies[PROFILE_COOKIE]) {
    await withDatabase((database) =>
      database.query(
        `DELETE FROM admin_profile_sessions WHERE token_hash = $1`,
        [hash(cookies[PROFILE_COOKIE])],
      ),
    );
  }
  response.setHeader(
    "Set-Cookie",
    serializeCookie(PROFILE_COOKIE, "", { ...cookieOptions(), maxAge: 0 }),
  );
}

export async function logoutAdmin(request: ApiRequest, response: ApiResponse) {
  await lockProfile(request, response);
  response.setHeader("Set-Cookie", [
    serializeCookie(PROFILE_COOKIE, "", { ...cookieOptions(), maxAge: 0 }),
    serializeCookie(GATEWAY_COOKIE, "", { ...cookieOptions(), maxAge: 0 }),
  ]);
}

export function requireGateway(request: ApiRequest) {
  const token = parseCookies(request.headers.cookie)[GATEWAY_COOKIE];
  if (!verifyGatewayToken(token))
    throw new HttpError(401, "Enter the workspace password first.");
}

export async function updateProfile(
  actor: AdminProfile,
  profileId: string,
  values: {
    name?: string;
    email?: string | null;
    roles?: ProfileRole[];
    active?: boolean;
    pin?: string;
  },
) {
  if (!actor.roles.includes("owner") && actor.id !== profileId) {
    throw new HttpError(403, "Only an Owner can update another profile.");
  }
  if (
    !actor.roles.includes("owner") &&
    (values.roles || values.active !== undefined)
  ) {
    throw new HttpError(403, "Only an Owner can change access.");
  }

  await withDatabase(
    async (database) => {
      if (
        values.active === false ||
        (values.roles && !values.roles.includes("owner"))
      ) {
        const target = await database.query<{ is_owner: boolean }>(
          `SELECT EXISTS(
          SELECT 1 FROM admin_profile_roles WHERE profile_id = $1 AND role = 'owner'
        ) AS is_owner`,
          [profileId],
        );
        if (target[0]?.is_owner) {
          const others = await database.query<{ count: number }>(
            `SELECT count(DISTINCT p.id)::int AS count
           FROM admin_profiles p JOIN admin_profile_roles r ON r.profile_id = p.id
           WHERE p.active = true AND r.role = 'owner' AND p.id <> $1`,
            [profileId],
          );
          if ((others[0]?.count || 0) === 0) {
            throw new HttpError(400, "Keep at least one active Owner profile.");
          }
        }
      }
      if (values.name !== undefined) {
        await database.query(
          `UPDATE admin_profiles SET name = $2, normalized_name = $3, updated_at = now() WHERE id = $1`,
          [profileId, values.name.trim(), normalize(values.name)],
        );
      }
      if (values.email !== undefined) {
        await database.query(
          `UPDATE admin_profiles SET email = $2, updated_at = now() WHERE id = $1`,
          [profileId, values.email || null],
        );
      }
      if (values.active !== undefined) {
        if (profileId === actor.id && !values.active)
          throw new HttpError(400, "You cannot suspend your own profile.");
        await database.query(
          `UPDATE admin_profiles SET active = $2, updated_at = now() WHERE id = $1`,
          [profileId, values.active],
        );
        if (!values.active) {
          await database.query(
            `DELETE FROM admin_profile_sessions WHERE profile_id = $1`,
            [profileId],
          );
        }
      }
      if (values.roles) {
        if (values.roles.length === 0)
          throw new HttpError(400, "Keep at least one role.");
        await database.query(
          `DELETE FROM admin_profile_roles WHERE profile_id = $1`,
          [profileId],
        );
        for (const role of [...new Set(values.roles)]) {
          await database.query(
            `INSERT INTO admin_profile_roles (profile_id, role) VALUES ($1, $2)`,
            [profileId, role],
          );
        }
      }
      if (values.pin) {
        const salt = crypto.randomBytes(16).toString("hex");
        await database.query(
          `UPDATE admin_profiles SET pin_salt = $2, pin_hash = $3, updated_at = now() WHERE id = $1`,
          [profileId, salt, await hashPin(values.pin, salt)],
        );
        await database.query(
          `DELETE FROM admin_profile_sessions WHERE profile_id = $1`,
          [profileId],
        );
      }
      await audit(database, actor.id, "profile.updated", "profile", profileId, {
        fields: Object.keys(values),
      });
    },
    { transaction: true },
  );
}

export async function audit(
  database: import("./database.js").DatabaseSession,
  profileId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await database.query(
    `INSERT INTO audit_events (profile_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [profileId, action, entityType, entityId, JSON.stringify(metadata)],
  );
}

function mapProfile(row: ProfileRow): AdminProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    color: row.color,
    roles: parseDatabaseArray(row.roles) as ProfileRole[],
    active: row.active,
    createdAt: iso(row.created_at),
    lastSeenAt: row.last_seen_at ? iso(row.last_seen_at) : null,
  };
}

function signGatewayToken() {
  const body = Buffer.from(
    JSON.stringify({
      exp: Date.now() + SESSION_TTL_SECONDS * 1000,
      pwv: passwordVersion(),
    }),
  ).toString("base64url");
  return `${body}.${hmac(body)}`;
}

function parseDatabaseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (
    typeof value !== "string" ||
    !value.startsWith("{") ||
    !value.endsWith("}")
  )
    return [];
  return value
    .slice(1, -1)
    .split(",")
    .map((item) => item.replace(/^"|"$/g, "").replace(/\\"/g, '"'))
    .filter(Boolean);
}

function verifyGatewayToken(token: string | undefined) {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(signature, hmac(body))) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as {
      exp: number;
      pwv: string;
    };
    if (payload.exp < Date.now() || payload.pwv !== passwordVersion())
      return null;
    return payload;
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    sameSite: "Strict" as const,
    secure: process.env.VERCEL === "1",
    path: "/",
  };
}

async function hashPin(pin: string, salt: string) {
  return ((await scrypt(pin, salt, 64)) as Buffer).toString("hex");
}

async function verifyPin(pin: string, salt: string, expected: string) {
  return safeEqual(await hashPin(pin, salt), expected);
}

async function assertNotRateLimited(key: string) {
  const rows = await withDatabase((database) =>
    database.query<{ locked_until: Date | string | null }>(
      `SELECT locked_until FROM admin_auth_attempts WHERE key = $1`,
      [key],
    ),
  );
  const lockedUntil = rows[0]?.locked_until;
  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  }
}

async function recordFailure(key: string, maximum: number) {
  await withDatabase((database) =>
    database.query(
      `INSERT INTO admin_auth_attempts (key, count, window_started_at, locked_until)
       VALUES ($1, 1, now(), NULL)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE
           WHEN admin_auth_attempts.window_started_at < now() - interval '15 minutes' THEN 1
           ELSE admin_auth_attempts.count + 1
         END,
         window_started_at = CASE
           WHEN admin_auth_attempts.window_started_at < now() - interval '15 minutes' THEN now()
           ELSE admin_auth_attempts.window_started_at
         END,
         locked_until = CASE
           WHEN admin_auth_attempts.count + 1 >= $2 THEN now() + interval '15 minutes'
           ELSE admin_auth_attempts.locked_until
         END`,
      [key, maximum],
    ),
  );
}

async function clearFailures(key: string) {
  await withDatabase((database) =>
    database.query(`DELETE FROM admin_auth_attempts WHERE key = $1`, [key]),
  );
}

function clientHash(request: ApiRequest) {
  return hmac(getClientIp(request) || "unknown").slice(0, 32);
}

function passwordVersion() {
  return hash(process.env.ADMIN_PASSWORD || "").slice(0, 16);
}

function hmac(value: string) {
  return crypto
    .createHmac(
      "sha256",
      process.env.ADMIN_SESSION_SECRET ||
        process.env.ADMIN_PASSWORD ||
        "local-admin-secret",
    )
    .update(value)
    .digest("base64url");
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
}

function iso(value: Date | string) {
  return new Date(value).toISOString();
}

function hashCode(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result << 5) - result + value.charCodeAt(index);
    result |= 0;
  }
  return result;
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "23505",
  );
}

export { databaseDriver };
