import type {
  AdminDashboard,
  AdminNotification,
  AdminProfile,
  AdminSession,
  ContentEntry,
  ContentRelease,
  CursorPage,
  EmailMessage,
  Lead,
  LeadAnalytics,
  LeadEvent,
  LeadStage,
  MediaAsset,
  Task,
} from "../../shared/admin-contracts";

let csrfToken = "";

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function setAdminCsrf(value: string | undefined) {
  csrfToken = value || "";
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (
    init.method &&
    !["GET", "HEAD"].includes(init.method.toUpperCase()) &&
    csrfToken
  ) {
    headers.set("X-Admin-CSRF", csrfToken);
  }
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1"
    ) {
      throw new AdminApiError(
        "The admin API is unavailable in Vite. Start it with pnpm dev:admin.",
        response.status,
      );
    }
    throw new AdminApiError(
      "The admin API returned an unexpected response.",
      response.status,
    );
  }
  const data = (await response.json()) as T & { error?: string; ok?: boolean };
  if (!response.ok || data.ok === false) {
    throw new AdminApiError(
      data.error || "The request could not be completed.",
      response.status,
    );
  }
  return data;
}

function body(value: unknown) {
  return JSON.stringify(value);
}

function queryString(
  values: Record<string, string | number | boolean | null | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "")
      query.set(key, String(value));
  }
  const result = query.toString();
  return result ? `?${result}` : "";
}

export const adminApi = {
  async session() {
    const session = await request<AdminSession & { databaseDriver?: string }>(
      "/api/admin/session",
    );
    setAdminCsrf(session.csrfToken);
    return session;
  },
  login(password: string) {
    return request<{ ok: true }>("/api/admin/login", {
      method: "POST",
      body: body({ password }),
    });
  },
  logout() {
    setAdminCsrf("");
    return request<{ ok: true }>("/api/admin/logout", { method: "POST" });
  },
  profiles() {
    return request<{ profiles: AdminProfile[] }>("/api/admin/profiles");
  },
  createProfile(name: string, pin: string) {
    return request<{ profile: AdminProfile }>("/api/admin/profiles", {
      method: "POST",
      body: body({ name, pin }),
    });
  },
  async unlockProfile(profileId: string, pin: string) {
    const result = await request<{ profile: AdminProfile; csrfToken: string }>(
      "/api/admin/profile-session",
      {
        method: "POST",
        body: body({ profileId, pin }),
      },
    );
    setAdminCsrf(result.csrfToken);
    return result;
  },
  lockProfile() {
    setAdminCsrf("");
    return request<{ ok: true }>("/api/admin/profile-session", {
      method: "DELETE",
    });
  },
  updateProfile(id: string, values: Record<string, unknown>) {
    return request<{ ok: true }>(`/api/admin/profiles/${id}`, {
      method: "PATCH",
      body: body(values),
    });
  },
  dashboard() {
    return request<{ dashboard: AdminDashboard }>("/api/admin/dashboard");
  },
  stages() {
    return request<{ stages: LeadStage[] }>("/api/admin/pipeline");
  },
  updateStages(stages: LeadStage[]) {
    return request<{ ok: true }>("/api/admin/pipeline-config", {
      method: "PATCH",
      body: body({ stages }),
    });
  },
  leads(filters: Record<string, string | number | boolean | undefined>) {
    return request<{ page: CursorPage<Lead> }>(
      `/api/admin/leads${queryString(filters)}`,
    );
  },
  lead(id: string) {
    return request<{
      detail: {
        lead: Lead;
        events: LeadEvent[];
        tasks: Task[];
        emails: EmailMessage[];
      };
    }>(`/api/admin/leads/${id}`);
  },
  updateLead(id: string, values: Record<string, unknown>) {
    return request<{ lead: Lead }>(`/api/admin/leads/${id}`, {
      method: "PATCH",
      body: body(values),
    });
  },
  trashLead(id: string) {
    return request<{ ok: true }>(`/api/admin/leads/${id}`, {
      method: "DELETE",
    });
  },
  addEvent(id: string, type: "note" | "call", eventBody: string) {
    return request<{ ok: true }>(`/api/admin/leads/${id}/events`, {
      method: "POST",
      body: body({ type, body: eventBody }),
    });
  },
  sendEmail(id: string, subject: string, emailBody: string) {
    return request<{ ok: true; message: EmailMessage }>(
      `/api/admin/leads/${id}/email`,
      {
        method: "POST",
        body: body({ action: "send", subject, body: emailBody }),
      },
    );
  },
  saveEmailDraft(id: string, subject: string, emailBody: string) {
    return request<{ ok: true; message: EmailMessage }>(
      `/api/admin/leads/${id}/email`,
      {
        method: "POST",
        body: body({ action: "draft", subject, body: emailBody }),
      },
    );
  },
  retryEmail(id: string, emailId: string) {
    return request<{ ok: true; message: EmailMessage }>(
      `/api/admin/leads/${id}/email`,
      {
        method: "POST",
        body: body({ action: "retry", emailId }),
      },
    );
  },
  emailTemplates() {
    return request<{
      configuration: {
        enabled: boolean;
        configured: boolean;
        fromEmail: string;
        replyToEmail: string;
      };
      templates: Array<{
        id: string;
        name: string;
        subject: string;
        body: string;
      }>;
    }>("/api/admin/email-templates");
  },
  tasks(options: { scope?: string; completed?: boolean } = {}) {
    return request<{ tasks: Task[] }>(
      `/api/admin/tasks${queryString(options)}`,
    );
  },
  createTask(values: Record<string, unknown>) {
    return request<{ id: string }>("/api/admin/tasks", {
      method: "POST",
      body: body(values),
    });
  },
  updateTask(id: string, values: Record<string, unknown>) {
    return request<{ ok: true }>(`/api/admin/tasks/${id}`, {
      method: "PATCH",
      body: body(values),
    });
  },
  notifications(includeRead = false) {
    return request<{ notifications: AdminNotification[] }>(
      `/api/admin/notifications?includeRead=${includeRead}`,
    );
  },
  markAllNotificationsRead() {
    return request<{ ok: true }>("/api/admin/notifications", {
      method: "PATCH",
    });
  },
  updateNotification(id: string, action: "read" | "unread" | "dismiss") {
    return request<{ ok: true }>(`/api/admin/notifications/${id}`, {
      method: "PATCH",
      body: body({ action }),
    });
  },
  analytics(days = 30) {
    return request<{ analytics: LeadAnalytics }>(
      `/api/admin/analytics?days=${days}`,
    );
  },
  content(filters: { kind?: string; q?: string; changed?: boolean } = {}) {
    return request<{ entries: ContentEntry[] }>(
      `/api/admin/content${queryString(filters)}`,
    );
  },
  contentEntry(id: string) {
    return request<{
      detail: {
        entry: ContentEntry;
        revisions: Array<{
          id: string;
          version: number;
          data: Record<string, unknown>;
          validationErrors: string[];
          profileName: string | null;
          note: string;
          createdAt: string;
        }>;
      };
    }>(`/api/admin/content/${id}`);
  },
  saveContent(id: string, values: Record<string, unknown>) {
    return request<{ detail: { entry: ContentEntry } }>(
      `/api/admin/content/${id}`,
      {
        method: "PATCH",
        body: body(values),
      },
    );
  },
  rollbackContent(id: string, revisionId: string) {
    return request<{ ok: true }>(`/api/admin/content/${id}/rollback`, {
      method: "POST",
      body: body({ revisionId }),
    });
  },
  contentHealth() {
    return request<{
      issues: Array<{
        entryId: string;
        key: string;
        title: string;
        kind: string;
        message: string;
        route: string | null;
      }>;
    }>("/api/admin/content-health");
  },
  contentReleases() {
    return request<{ releases: ContentRelease[] }>(
      "/api/admin/content-releases",
    );
  },
  publishContent(note: string) {
    return request<{ release: ContentRelease }>("/api/admin/content-releases", {
      method: "POST",
      body: body({ note }),
    });
  },
  confirmRelease(id: string) {
    return request<{ live: boolean; release: ContentRelease | null }>(
      `/api/admin/content-releases/${id}`,
      { method: "POST" },
    );
  },
  media(q = "") {
    return request<{ media: MediaAsset[] }>(
      `/api/admin/media${queryString({ q })}`,
    );
  },
  updateMedia(id: string, values: Record<string, unknown>) {
    return request<{ ok: true }>(`/api/admin/media/${id}`, {
      method: "PATCH",
      body: body(values),
    });
  },
  trashMedia(id: string) {
    return request<{ ok: true }>(`/api/admin/media/${id}`, {
      method: "DELETE",
    });
  },
  team() {
    return request<{ profiles: AdminProfile[] }>("/api/admin/team");
  },
  settings() {
    return request<{
      settings: {
        values: Record<string, unknown>;
        notificationPreferences: {
          browser: boolean;
          emailImmediate: boolean;
          emailDigest: boolean;
        };
        customFields: Array<Record<string, unknown>>;
      };
    }>("/api/admin/settings");
  },
  legacySubmissions(limit = 250) {
    return request<{
      readOnly: true;
      storageDriver: string | null;
      submissions: Array<{
        id: string;
        formType: string;
        createdAt: string;
        status: "new" | "contacted" | "archived";
        summary: string;
        sourcePage: string;
        contact: {
          name: string;
          email: string;
          phone?: string;
          country?: string;
        };
        fields: Record<string, string>;
      }>;
    }>(`/api/admin/submissions?limit=${Math.min(1000, Math.max(1, limit))}`);
  },
  updateSetting(key: string, value: unknown) {
    return request<{ ok: true }>("/api/admin/settings", {
      method: "PATCH",
      body: body({ key, value }),
    });
  },
  preferences() {
    return request<{
      preferences: {
        browser: boolean;
        emailImmediate: boolean;
        emailDigest: boolean;
      };
    }>("/api/admin/preferences");
  },
  updatePreferences(values: Record<string, boolean>) {
    return request<{ ok: true }>("/api/admin/preferences", {
      method: "PATCH",
      body: body(values),
    });
  },
  savedViews() {
    return request<{
      views: Array<{
        id: string;
        name: string;
        filters: Record<string, unknown>;
        columns: string[];
        sort: string;
      }>;
    }>("/api/admin/saved-views");
  },
  saveView(values: {
    name: string;
    filters: Record<string, unknown>;
    columns: string[];
    sort: string;
  }) {
    return request<{ ok: true }>("/api/admin/saved-views", {
      method: "POST",
      body: body(values),
    });
  },
  customFields() {
    return request<{ fields: Array<Record<string, unknown>> }>(
      "/api/admin/custom-fields",
    );
  },
  saveCustomField(values: Record<string, unknown>) {
    return request<{ ok: true }>("/api/admin/custom-fields", {
      method: "POST",
      body: body(values),
    });
  },
};

export function adminExportUrl(
  filters: Record<string, string | number | boolean | null | undefined>,
) {
  return `/api/admin/export${queryString(filters)}`;
}

export function adminCsrfToken() {
  return csrfToken;
}
