export type SubmissionStatus = "new" | "contacted" | "archived";

// Keep in sync with api/_lib/submissions.js SUBMISSION_STATUSES.
export const SUBMISSION_STATUSES: SubmissionStatus[] = [
  "new",
  "contacted",
  "archived",
];

export interface AdminSubmission {
  id: string;
  formType: string;
  createdAt: string;
  status: SubmissionStatus;
  summary: string;
  sourcePage: string;
  contact: {
    name: string;
    email: string;
    phone?: string;
    country?: string;
  };
  fields: Record<string, string>;
  meta: {
    ipAddress?: string;
    referer?: string;
    userAgent?: string;
  };
}

export interface AdminSession {
  authenticated: boolean;
  configured: boolean;
  expiresAt?: string;
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function fetchAdminSession(): Promise<AdminSession> {
  const res = await fetch("/api/admin/session", { credentials: "same-origin" });
  return readJson<AdminSession>(res);
}

export async function loginAdmin(password: string) {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ password }),
  });

  const data = await readJson<{
    ok?: boolean;
    error?: string;
    authenticated?: boolean;
    configured?: boolean;
  }>(res);
  if (!res.ok || data.ok === false)
    throw new Error(data.error || "Unable to sign in.");
  return data;
}

export async function logoutAdmin() {
  await fetch("/api/admin/logout", {
    method: "POST",
    credentials: "same-origin",
  });
}

export async function fetchAdminSubmissions(limit = 100) {
  const res = await fetch(`/api/admin/submissions?limit=${limit}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });

  const data = await readJson<{
    ok?: boolean;
    error?: string;
    submissions?: AdminSubmission[];
    storageDriver?: string;
  }>(res);
  if (!res.ok || data.ok === false)
    throw new Error(data.error || "Unable to load submissions.");
  return {
    submissions: data.submissions || [],
    storageDriver: data.storageDriver || "unknown",
  };
}

export async function updateSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): Promise<void> {
  const res = await fetch(`/api/admin/submissions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await readJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok || data.ok === false)
    throw new Error(data.error || "Unable to update submission.");
}

export async function deleteSubmission(id: string): Promise<void> {
  const res = await fetch(`/api/admin/submissions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const data = await readJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok || data.ok === false)
    throw new Error(data.error || "Unable to delete submission.");
}
