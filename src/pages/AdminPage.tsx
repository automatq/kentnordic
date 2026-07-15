import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

import type { AdminProfile, AdminSession } from "../../shared/admin-contracts";
import { adminApi } from "@/admin/api";
import AdminApp from "@/admin/AdminApp";
import { AdminAvatar, AdminButton, ErrorBanner, LoadingState } from "@/admin/components";
import { AdminProvider } from "@/admin/context";
import "@/styles/admin.css";

type AccessStep = "loading" | "gateway" | "profiles" | "console" | "error";

export default function AdminPage() {
  const [session, setSession] = useState<AdminSession>({
    authenticated: false,
    gatewayAuthenticated: false,
    configured: true,
    databaseConfigured: false,
    profile: null,
  });
  const [step, setStep] = useState<AccessStep>("loading");
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [error, setError] = useState("");

  const bootstrap = useCallback(async () => {
    setError("");
    setStep("loading");
    try {
      const next = await adminApi.session();
      setSession(next);
      if (next.authenticated && next.profile) {
        setStep("console");
        return;
      }
      if (!next.gatewayAuthenticated) {
        setStep("gateway");
        return;
      }
      const result = await adminApi.profiles();
      setProfiles(result.profiles.filter((profile) => profile.active));
      setStep("profiles");
    } catch (caught) {
      setError(messageOf(caught));
      setStep("error");
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <>
      <Helmet>
        <title>Admin console | Idcibidci</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      {step === "console" && session.profile ? (
        <AdminProvider initialSession={session}>
          <AdminApp onAccessChanged={bootstrap} />
        </AdminProvider>
      ) : (
        <main className="admin-access-shell">
          <div className="admin-access-brand" aria-label="Idcibidci">
            <img src="/idcibidci-wordmark.png" alt="Idcibidci" />
            <span>Admin</span>
          </div>
          {step === "loading" && <LoadingState label="Opening the workspace" />}
          {step === "gateway" && (
            <GatewayAccess
              configured={session.configured}
              databaseConfigured={session.databaseConfigured}
              onSuccess={bootstrap}
            />
          )}
          {step === "profiles" && (
            <ProfileAccess
              profiles={profiles}
              onSuccess={bootstrap}
              onSignOut={async () => {
                await adminApi.logout();
                await bootstrap();
              }}
              onProfilesChanged={async () => {
                const result = await adminApi.profiles();
                setProfiles(result.profiles.filter((profile) => profile.active));
              }}
            />
          )}
          {step === "error" && (
            <div className="admin-access-card">
              <ErrorBanner message={error} onRetry={() => void bootstrap()} />
            </div>
          )}
          <p className="admin-access-footnote">
            Shared workspace access with named, attributed profiles.
          </p>
        </main>
      )}
    </>
  );
}

function GatewayAccess({
  configured,
  databaseConfigured,
  onSuccess,
}: {
  configured: boolean;
  databaseConfigured: boolean;
  onSuccess: () => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminApi.login(password);
      await onSuccess();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-access-card" aria-labelledby="gateway-title">
      <p className="admin-eyebrow">Private workspace</p>
      <h1 id="gateway-title">Welcome back</h1>
      <p>Enter the team’s shared password. You’ll choose your personal profile next.</p>
      {!configured && (
        <div className="admin-access-warning" role="alert">
          Set <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code> before using the console.
        </div>
      )}
      {!databaseConfigured && (
        <p className="admin-access-local">Local development database active</p>
      )}
      <form onSubmit={submit} className="admin-access-form">
        <label className="admin-field">
          <span>Shared password</span>
          <input
            autoFocus
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="admin-form-error" role="alert">{error}</p>}
        <AdminButton tone="primary" type="submit" disabled={busy || !configured}>
          {busy ? "Checking…" : "Continue"}
        </AdminButton>
      </form>
    </section>
  );
}

function ProfileAccess({
  profiles,
  onSuccess,
  onSignOut,
  onProfilesChanged,
}: {
  profiles: AdminProfile[];
  onSuccess: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onProfilesChanged: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<AdminProfile | null>(profiles[0] || null);
  const [creating, setCreating] = useState(profiles.length === 0);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await adminApi.unlockProfile(selected.id, pin);
      await onSuccess();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await adminApi.createProfile(name, pin);
      await onProfilesChanged();
      await adminApi.unlockProfile(result.profile.id, pin);
      await onSuccess();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-access-card admin-access-card--profiles" aria-labelledby="profile-title">
      <p className="admin-eyebrow">Personal workspace</p>
      <h1 id="profile-title">{creating ? "Create your profile" : "Who’s working?"}</h1>
      <p>
        {creating
          ? profiles.length === 0
            ? "The first profile becomes Owner. Choose a name and a four-digit PIN."
            : "New profiles begin with Sales access. An Owner can change access later."
          : "Your profile keeps assignments, notes, and notifications in the right place."}
      </p>

      {creating ? (
        <form onSubmit={create} className="admin-access-form">
          <label className="admin-field">
            <span>Your name</span>
            <input autoFocus autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
          </label>
          <PinField value={pin} onChange={setPin} />
          {error && <p className="admin-form-error" role="alert">{error}</p>}
          <div className="admin-access-actions">
            {profiles.length > 0 && <AdminButton type="button" onClick={() => { setCreating(false); setError(""); }}>Back</AdminButton>}
            <AdminButton tone="primary" type="submit" disabled={busy || pin.length !== 4 || name.trim().length < 2}>
              {busy ? "Creating…" : "Create and enter"}
            </AdminButton>
          </div>
        </form>
      ) : (
        <>
          <div className="admin-profile-grid" role="list" aria-label="Profiles">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                className={selected?.id === profile.id ? "is-selected" : ""}
                type="button"
                role="listitem"
                onClick={() => { setSelected(profile); setPin(""); setError(""); }}
              >
                <AdminAvatar profile={profile} size="lg" />
                <strong>{profile.name}</strong>
                <span>{profile.roles.map(roleLabel).join(" · ")}</span>
              </button>
            ))}
          </div>
          <form onSubmit={unlock} className="admin-access-form admin-pin-form">
            <PinField value={pin} onChange={setPin} name={selected?.name} />
            {error && <p className="admin-form-error" role="alert">{error}</p>}
            <AdminButton tone="primary" type="submit" disabled={busy || !selected || pin.length !== 4}>
              {busy ? "Unlocking…" : `Enter as ${selected?.name || "profile"}`}
            </AdminButton>
          </form>
          <div className="admin-access-secondary">
            <button type="button" onClick={() => { setCreating(true); setPin(""); setError(""); }}>Create another profile</button>
            <button type="button" onClick={() => void onSignOut()}>Use a different password</button>
          </div>
        </>
      )}
    </section>
  );
}

function PinField({ value, onChange, name }: { value: string; onChange: (value: string) => void; name?: string }) {
  return (
    <label className="admin-field admin-pin-field">
      <span>{name ? `${name}’s PIN` : "Four-digit PIN"}</span>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{4}"
        maxLength={4}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        required
        aria-label={name ? `${name}’s four-digit PIN` : "Four-digit PIN"}
      />
    </label>
  );
}

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
