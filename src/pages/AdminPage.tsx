import { useEffect, useState } from "react";
import BaseLayout from "@/layouts/BaseLayout";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import {
  fetchAdminSession,
  fetchAdminSubmissions,
  loginAdmin,
  logoutAdmin,
  type AdminSubmission,
  type AdminSession,
} from "@/lib/adminApi";

type LoadState = "loading" | "ready" | "error";

const dtf = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

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
        await loadSubmissions();
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

  async function loadSubmissions() {
    const result = await fetchAdminSubmissions();
    setSubmissions(result.submissions);
    setStorageDriver(result.storageDriver);
    setState("ready");
  }

  async function onLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginAdmin(password);
      setPassword("");
      setSession({ authenticated: true, configured: true });
      await loadSubmissions();
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
      await loadSubmissions();
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

              {state === "loading" ? (
                <div className="rounded-[1.75rem] border border-line bg-white p-8 text-charcoal-soft">
                  Loading submissions…
                </div>
              ) : submissions.length === 0 ? (
                <div className="rounded-[1.75rem] border border-line bg-white p-8 text-charcoal-soft">
                  No submissions yet.
                </div>
              ) : (
                <div className="space-y-5">
                  {submissions.map((submission) => (
                    <article
                      key={submission.id}
                      className="rounded-[1.75rem] border border-line bg-white p-6 shadow-soft"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal-soft">
                            {submission.formType}
                          </p>
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
                        <div className="text-sm text-charcoal-soft">
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
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </Container>
      </Section>
    </BaseLayout>
  );
}
