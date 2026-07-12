import { useEffect, useMemo, useState } from "react";
import BaseLayout from "@/layouts/BaseLayout";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import {
  fetchAdminSession,
  fetchAdminSubmissions,
  loginAdmin,
  logoutAdmin,
  updateSubmissionStatus,
  deleteSubmission,
  SUBMISSION_STATUSES,
  type AdminSubmission,
  type AdminSession,
  type SubmissionStatus,
} from "@/lib/adminApi";

type LoadState = "loading" | "ready" | "error";
type FormTypeFilter = "all" | "inquiry" | "rate-sheet";
type StatusFilter = "all" | SubmissionStatus;

const PAGE_SIZE = 100;

const dtf = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  new: "New",
  contacted: "Contacted",
  archived: "Archived",
};

const STATUS_BADGE_CLASS: Record<SubmissionStatus, string> = {
  new: "bg-accent/10 text-accent-700",
  contacted: "bg-cream text-charcoal border border-charcoal/15",
  archived: "bg-charcoal/10 text-charcoal-soft",
};

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function submissionsToCsv(rows: AdminSubmission[]): string {
  const headers = [
    "Date",
    "Type",
    "Status",
    "Summary",
    "Name",
    "Email",
    "Phone",
    "Country",
    "Source",
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const s of rows) {
    lines.push(
      [
        dtf.format(new Date(s.createdAt)),
        s.formType,
        s.status,
        s.summary,
        s.contact.name,
        s.contact.email,
        s.contact.phone || "",
        s.contact.country || "",
        s.sourcePage,
      ]
        .map((v) => csvCell(String(v)))
        .join(","),
    );
  }
  return lines.join("\r\n");
}

function downloadCsv(rows: AdminSubmission[]) {
  const blob = new Blob([submissionsToCsv(rows)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `submissions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [session, setSession] = useState<AdminSession>({
    authenticated: false,
    configured: true,
  });
  const [state, setState] = useState<LoadState>("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [storageDriver, setStorageDriver] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [formTypeFilter, setFormTypeFilter] = useState<FormTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    setState("loading");
    setError("");
    try {
      const nextSession = await fetchAdminSession();
      setSession(nextSession);

      if (nextSession.authenticated) {
        await loadSubmissions(PAGE_SIZE);
      } else {
        setState("ready");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load admin session.",
      );
      setState("error");
    }
  }

  async function loadSubmissions(nextLimit: number) {
    const result = await fetchAdminSubmissions(nextLimit);
    setSubmissions(result.submissions);
    setStorageDriver(result.storageDriver);
    setLimit(nextLimit);
    setState("ready");
  }

  async function onLoadMore() {
    setBusy(true);
    setError("");
    try {
      await loadSubmissions(limit + PAGE_SIZE);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load more submissions.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onUpdateStatus(id: string, status: SubmissionStatus) {
    setRowBusyId(id);
    setError("");
    const previous = submissions;
    setSubmissions((current) =>
      current.map((s) => (s.id === id ? { ...s, status } : s)),
    );
    try {
      await updateSubmissionStatus(id, status);
    } catch (err) {
      setSubmissions(previous);
      setError(
        err instanceof Error ? err.message : "Unable to update submission.",
      );
    } finally {
      setRowBusyId(null);
    }
  }

  async function onDelete(id: string, label: string) {
    if (!window.confirm(`Delete "${label}" permanently? This can't be undone.`)) {
      return;
    }
    setRowBusyId(id);
    setError("");
    const previous = submissions;
    setSubmissions((current) => current.filter((s) => s.id !== id));
    try {
      await deleteSubmission(id);
    } catch (err) {
      setSubmissions(previous);
      setError(
        err instanceof Error ? err.message : "Unable to delete submission.",
      );
    } finally {
      setRowBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((s) => {
      if (formTypeFilter !== "all" && s.formType !== formTypeFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        s.summary,
        s.contact.name,
        s.contact.email,
        s.sourcePage,
        ...Object.values(s.fields),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [submissions, search, formTypeFilter, statusFilter]);

  const newCount = useMemo(
    () => submissions.filter((s) => s.status === "new").length,
    [submissions],
  );

  async function onLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginAdmin(password);
      setPassword("");
      setSession({ authenticated: true, configured: true });
      await loadSubmissions(PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setState("ready");
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    setBusy(true);
    try {
      await logoutAdmin();
      setSession((current) => ({ ...current, authenticated: false }));
      setSubmissions([]);
      setState("ready");
    } finally {
      setBusy(false);
    }
  }

  async function onRefresh() {
    setBusy(true);
    setError("");
    try {
      await loadSubmissions(limit);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to refresh submissions.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <BaseLayout
      title="Admin"
      description="Protected submission inbox for Idcibidci"
      noindex
    >
      <Section tone="cream">
        <Container className="max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="u-eyebrow">Admin</p>
            <h1 className="font-display text-4xl text-ink sm:text-5xl">
              Submission inbox
            </h1>
            <p className="mt-4 text-lg text-charcoal-soft">
              All website form submissions land here through the Vercel admin
              backend.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="white">
        <Container className="max-w-5xl">
          {!session.configured && (
            <div className="rounded-2xl border border-error/20 bg-error/5 p-6 text-error">
              <p className="font-medium">Admin is not configured yet.</p>
              <p className="mt-2 text-sm">
                Set <code>ADMIN_PASSWORD</code> and, on Vercel, connect a
                private Blob store before using this inbox.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-error">
              {error}
            </div>
          )}

          {!session.authenticated ? (
            <div className="mx-auto max-w-md rounded-[1.75rem] border border-line bg-white p-8 shadow-soft">
              <h2 className="font-display text-3xl text-ink">Admin sign in</h2>
              <p className="mt-2 text-sm text-charcoal-soft">
                Use the password configured on the server. Access is
                session-based and stored in an HTTP-only cookie.
              </p>

              <form className="mt-6 flex flex-col gap-4" onSubmit={onLogin}>
                <label className="text-sm font-medium text-charcoal">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-charcoal/15 bg-white px-3.5 py-3 outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-100)]"
                    autoComplete="current-password"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || !session.configured}
                  className="inline-flex items-center justify-center rounded-pill bg-accent px-6 py-3 font-medium text-white transition hover:bg-accent-600 disabled:pointer-events-none disabled:opacity-60"
                >
                  {busy ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 rounded-[1.75rem] border border-line bg-cream p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-charcoal-soft">
                    Admin session
                  </p>
                  <p className="mt-2 text-charcoal-soft">
                    Storage driver:{" "}
                    <span className="font-medium text-ink">
                      {storageDriver}
                    </span>
                    {submissions.length > 0 && (
                      <>
                        {" · "}
                        {submissions.length} loaded
                        {newCount > 0 && (
                          <>
                            {" · "}
                            <span className="font-medium text-accent-700">
                              {newCount} new
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={busy}
                    className="rounded-pill border border-charcoal/20 px-5 py-2.5 text-sm font-medium transition hover:bg-charcoal hover:text-white disabled:pointer-events-none disabled:opacity-60"
                  >
                    {busy ? "Refreshing…" : "Refresh"}
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    disabled={busy}
                    className="rounded-pill border border-charcoal/20 px-5 py-2.5 text-sm font-medium transition hover:bg-charcoal hover:text-white disabled:pointer-events-none disabled:opacity-60"
                  >
                    Sign out
                  </button>
                </div>
              </div>

              {submissions.length > 0 && (
                <div className="flex flex-col gap-3 rounded-[1.75rem] border border-line bg-white p-5 shadow-soft md:flex-row md:flex-wrap md:items-center">
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search agency, name, email, message…"
                    aria-label="Search submissions"
                    className="min-w-[220px] flex-1 rounded-xl border border-charcoal/15 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-100)]"
                  />
                  <select
                    value={formTypeFilter}
                    onChange={(event) =>
                      setFormTypeFilter(event.target.value as FormTypeFilter)
                    }
                    aria-label="Filter by form type"
                    className="rounded-xl border border-charcoal/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-accent"
                  >
                    <option value="all">All types</option>
                    <option value="inquiry">Inquiry</option>
                    <option value="rate-sheet">Rate sheet</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                    aria-label="Filter by status"
                    className="rounded-xl border border-charcoal/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-accent"
                  >
                    <option value="all">All statuses</option>
                    {SUBMISSION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => downloadCsv(filtered)}
                    disabled={filtered.length === 0}
                    className="rounded-pill border border-charcoal/20 px-5 py-2.5 text-sm font-medium transition hover:bg-charcoal hover:text-white disabled:pointer-events-none disabled:opacity-60"
                  >
                    Export CSV ({filtered.length})
                  </button>
                </div>
              )}

              {state === "loading" ? (
                <div className="rounded-[1.75rem] border border-line bg-white p-8 text-charcoal-soft">
                  Loading submissions…
                </div>
              ) : submissions.length === 0 ? (
                <div className="rounded-[1.75rem] border border-line bg-white p-8 text-charcoal-soft">
                  No submissions yet.
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-[1.75rem] border border-line bg-white p-8 text-charcoal-soft">
                  No submissions match the current filters.
                </div>
              ) : (
                <div className="space-y-5">
                  {filtered.map((submission) => (
                    <article
                      key={submission.id}
                      className="rounded-[1.75rem] border border-line bg-white p-6 shadow-soft"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-soft">
                              {submission.formType}
                            </p>
                            <span
                              className={`rounded-pill px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[submission.status]}`}
                            >
                              {STATUS_LABEL[submission.status]}
                            </span>
                          </div>
                          <h2 className="mt-2 font-display text-2xl text-ink">
                            {submission.summary}
                          </h2>
                          <p className="mt-1 text-sm text-charcoal-soft">
                            {submission.contact.name} ·{" "}
                            <a
                              href={`mailto:${submission.contact.email}`}
                              className="text-accent-700 hover:text-accent-600"
                            >
                              {submission.contact.email}
                            </a>
                          </p>
                        </div>
                        <div className="text-sm text-charcoal-soft md:text-right">
                          <p>{dtf.format(new Date(submission.createdAt))}</p>
                          <p>Source: {submission.sourcePage}</p>
                        </div>
                      </div>

                      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                        {Object.entries(submission.fields).map(
                          ([label, value]) => (
                            <div
                              key={label}
                              className="rounded-2xl bg-cream p-4"
                            >
                              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
                                {label}
                              </dt>
                              <dd className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-charcoal">
                                {value}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>

                      <div className="mt-5 grid gap-3 text-sm text-charcoal-soft md:grid-cols-3">
                        <p>IP: {submission.meta.ipAddress || "—"}</p>
                        <p>Referer: {submission.meta.referer || "—"}</p>
                        <p className="truncate">
                          User agent: {submission.meta.userAgent || "—"}
                        </p>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                        {submission.status !== "contacted" && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(submission.id, "contacted")}
                            disabled={rowBusyId === submission.id}
                            className="rounded-pill border border-charcoal/20 px-4 py-2 text-xs font-medium transition hover:bg-charcoal hover:text-white disabled:pointer-events-none disabled:opacity-60"
                          >
                            Mark contacted
                          </button>
                        )}
                        {submission.status !== "archived" && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(submission.id, "archived")}
                            disabled={rowBusyId === submission.id}
                            className="rounded-pill border border-charcoal/20 px-4 py-2 text-xs font-medium transition hover:bg-charcoal hover:text-white disabled:pointer-events-none disabled:opacity-60"
                          >
                            Archive
                          </button>
                        )}
                        {submission.status !== "new" && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(submission.id, "new")}
                            disabled={rowBusyId === submission.id}
                            className="rounded-pill border border-charcoal/20 px-4 py-2 text-xs font-medium transition hover:bg-charcoal hover:text-white disabled:pointer-events-none disabled:opacity-60"
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(submission.id, submission.summary)}
                          disabled={rowBusyId === submission.id}
                          className="rounded-pill border border-error/30 px-4 py-2 text-xs font-medium text-error transition hover:bg-error hover:text-white disabled:pointer-events-none disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {state === "ready" && submissions.length >= limit && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={busy}
                    className="rounded-pill border border-charcoal/20 px-6 py-2.5 text-sm font-medium transition hover:bg-charcoal hover:text-white disabled:pointer-events-none disabled:opacity-60"
                  >
                    {busy ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>
          )}
        </Container>
      </Section>
    </BaseLayout>
  );
}
