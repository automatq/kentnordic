import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import type { ProfileRole } from "../../shared/admin-contracts";
import Icon from "@/components/ui/Icon";
import { adminApi } from "./api";
import { AdminAvatar, AdminButton, Modal } from "./components";
import { useAdmin } from "./context";
import {
  AnalyticsPage,
  ContentEditorPage,
  ContentPage,
  LeadDetailPage,
  LegacyInboxPage,
  LeadsPage,
  MediaPage,
  MyWorkPage,
  OverviewPage,
  RolloutPausedPage,
  SettingsPage,
  TeamPage,
} from "./pages";

const navigation: Array<{
  to: string;
  label: string;
  icon: string;
  roles?: ProfileRole[];
  section?: "work" | "website" | "manage";
}> = [
  { to: "/admin", label: "Overview", icon: "compass", section: "work" },
  {
    to: "/admin/leads",
    label: "Leads",
    icon: "group",
    roles: ["sales", "owner"],
    section: "work",
  },
  {
    to: "/admin/work",
    label: "My Work",
    icon: "check",
    roles: ["sales", "owner"],
    section: "work",
  },
  {
    to: "/admin/content",
    label: "Content",
    icon: "pen",
    roles: ["editor", "owner"],
    section: "website",
  },
  {
    to: "/admin/media",
    label: "Media",
    icon: "layers",
    roles: ["editor", "owner"],
    section: "website",
  },
  {
    to: "/admin/analytics",
    label: "Analytics",
    icon: "calculator",
    roles: ["sales", "owner"],
    section: "work",
  },
  {
    to: "/admin/team",
    label: "Team",
    icon: "shield",
    roles: ["owner"],
    section: "manage",
  },
  {
    to: "/admin/settings",
    label: "Settings",
    icon: "sparkles",
    roles: ["owner"],
    section: "manage",
  },
];

export default function AdminApp({
  onAccessChanged,
}: {
  onAccessChanged: () => Promise<void>;
}) {
  const {
    session,
    notifications,
    unreadCount,
    refreshNotifications,
    toast,
    clearToast,
  } = useAdmin();
  const profile = session.profile!;
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("admin.sidebar") === "collapsed",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const v2Enabled = session.adminV2Enabled !== false;

  const allowedNavigation = useMemo(
    () =>
      (v2Enabled
        ? navigation
        : [
            {
              to: "/admin",
              label: "Legacy inbox",
              icon: "mail",
              roles: ["owner" as ProfileRole],
              section: "manage" as const,
            },
          ]
      ).filter(
        (item) =>
          !item.roles ||
          item.roles.some((role) => profile.roles.includes(role)),
      ),
    [profile.roles, v2Enabled],
  );

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandsOpen((current) => !current);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  async function lock() {
    await adminApi.lockProfile();
    await onAccessChanged();
  }

  async function signOut() {
    await adminApi.logout();
    await onAccessChanged();
  }

  return (
    <div className={`admin-shell ${collapsed ? "admin-shell--collapsed" : ""}`}>
      <a className="admin-skip-link" href="#admin-main">
        Skip to content
      </a>
      {mobileOpen && (
        <button
          className="admin-mobile-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`admin-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="admin-sidebar-brand">
          <img src="/idcibidci-wordmark.png" alt="Idcibidci" />
          <span>Admin</span>
        </div>
        <nav aria-label="Admin navigation">
          {(["work", "website", "manage"] as const).map((section) => {
            const items = allowedNavigation.filter(
              (item) => item.section === section,
            );
            if (!items.length) return null;
            return (
              <div className="admin-nav-group" key={section}>
                <span>
                  {section === "work"
                    ? "Sales"
                    : section === "website"
                      ? "Website"
                      : "Workspace"}
                </span>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/admin"}
                  >
                    <Icon name={item.icon} size={19} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <button
          className="admin-sidebar-toggle"
          type="button"
          onClick={() => {
            const next = !collapsed;
            setCollapsed(next);
            localStorage.setItem(
              "admin.sidebar",
              next ? "collapsed" : "expanded",
            );
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name="arrow" size={18} />
          <span>Collapse</span>
        </button>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <button
            className="admin-icon-button admin-mobile-menu"
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Icon name="menu" size={21} />
          </button>
          <button
            className="admin-command-trigger"
            type="button"
            onClick={() => setCommandsOpen(true)}
            aria-label="Search or jump to"
          >
            <Icon name="compass" size={17} />
            <span>Search or jump to…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="admin-topbar-actions">
            <div className="admin-popover-anchor">
              <button
                className="admin-icon-button admin-bell"
                type="button"
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  setProfileOpen(false);
                }}
                aria-label={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
                aria-expanded={notificationsOpen}
              >
                <Icon name="mail" size={19} />
                {unreadCount > 0 && (
                  <span>{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
              </button>
              {notificationsOpen && (
                <NotificationPopover
                  onClose={() => setNotificationsOpen(false)}
                  onChanged={() => void refreshNotifications()}
                  notifications={notifications}
                />
              )}
            </div>
            <div className="admin-popover-anchor">
              <button
                className="admin-profile-trigger"
                type="button"
                onClick={() => {
                  setProfileOpen((current) => !current);
                  setNotificationsOpen(false);
                }}
                aria-expanded={profileOpen}
                aria-label={`Profile: ${profile.name}`}
              >
                <AdminAvatar profile={profile} size="sm" />
                <span>{profile.name}</span>
                <Icon name="arrow-down" size={14} />
              </button>
              {profileOpen && (
                <div className="admin-profile-popover">
                  <div>
                    <AdminAvatar profile={profile} />
                    <p>
                      <strong>{profile.name}</strong>
                      <span>{profile.roles.join(" · ")}</span>
                    </p>
                  </div>
                  <button type="button" onClick={() => void lock()}>
                    Switch profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setPreferencesOpen(true);
                    }}
                  >
                    Notification preferences
                  </button>
                  <button type="button" onClick={() => void lock()}>
                    Lock workspace
                  </button>
                  <button type="button" onClick={() => void signOut()}>
                    Sign out on this device
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="admin-main" className="admin-main" tabIndex={-1}>
          <Routes>
            <Route
              index
              element={
                v2Enabled ? (
                  <OverviewPage />
                ) : profile.roles.includes("owner") ? (
                  <LegacyInboxPage />
                ) : (
                  <RolloutPausedPage />
                )
              }
            />
            {v2Enabled && (
              <>
                <Route
                  path="leads"
                  element={
                    <RoleRoute roles={["sales", "owner"]}>
                      <LeadsPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="leads/:leadId"
                  element={
                    <RoleRoute roles={["sales", "owner"]}>
                      <LeadDetailPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="work"
                  element={
                    <RoleRoute roles={["sales", "owner"]}>
                      <MyWorkPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="content"
                  element={
                    <RoleRoute roles={["editor", "owner"]}>
                      <ContentPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="content/:entryId"
                  element={
                    <RoleRoute roles={["editor", "owner"]}>
                      <ContentEditorPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="media"
                  element={
                    <RoleRoute roles={["editor", "owner"]}>
                      <MediaPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <RoleRoute roles={["sales", "owner"]}>
                      <AnalyticsPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="team"
                  element={
                    <RoleRoute roles={["owner"]}>
                      <TeamPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <RoleRoute roles={["owner"]}>
                      <SettingsPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="legacy"
                  element={
                    <RoleRoute roles={["owner"]}>
                      <LegacyInboxPage />
                    </RoleRoute>
                  }
                />
              </>
            )}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>

      {commandsOpen && (
        <CommandPalette
          items={allowedNavigation}
          onClose={() => setCommandsOpen(false)}
          onSelect={(path) => {
            navigate(path);
            setCommandsOpen(false);
          }}
        />
      )}
      <NotificationPreferences
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
      {toast && (
        <div
          className={`admin-toast admin-toast--${toast.tone}`}
          role="status"
          onClick={clearToast}
        >
          <Icon name={toast.tone === "error" ? "close" : "check"} size={17} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

function NotificationPreferences({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { notify } = useAdmin();
  const [values, setValues] = useState({
    browser: false,
    emailImmediate: false,
    emailDigest: false,
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open)
      void adminApi
        .preferences()
        .then((result) => setValues(result.preferences));
  }, [open]);
  async function save() {
    setBusy(true);
    try {
      let next = values;
      if (
        values.browser &&
        "Notification" in window &&
        Notification.permission !== "granted"
      ) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") next = { ...values, browser: false };
      }
      await adminApi.updatePreferences(next);
      setValues(next);
      notify("Notification preferences saved.");
      onClose();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to save preferences.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      title="Notification preferences"
      description="In-app notifications are always available. Optional channels belong to this profile."
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            tone="primary"
            disabled={busy}
            onClick={() => void save()}
          >
            Save preferences
          </AdminButton>
        </>
      }
    >
      <div className="admin-checkbox-list">
        <label>
          <input
            type="checkbox"
            checked={values.browser}
            onChange={(event) =>
              setValues({ ...values, browser: event.target.checked })
            }
          />
          <span>
            <strong>Browser alerts</strong>
            <small>
              Show system notifications for new items while this profile is
              signed in.
            </small>
          </span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={values.emailImmediate}
            onChange={(event) =>
              setValues({ ...values, emailImmediate: event.target.checked })
            }
          />
          <span>
            <strong>Immediate email escalation</strong>
            <small>
              Send urgent failures and SLA issues to your profile email.
            </small>
          </span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={values.emailDigest}
            onChange={(event) =>
              setValues({ ...values, emailDigest: event.target.checked })
            }
          />
          <span>
            <strong>Daily digest</strong>
            <small>Receive a concise daily summary of assigned work.</small>
          </span>
        </label>
      </div>
    </Modal>
  );
}

function RoleRoute({
  roles,
  children,
}: {
  roles: ProfileRole[];
  children: React.ReactNode;
}) {
  const { session } = useAdmin();
  return roles.some((role) => session.profile?.roles.includes(role)) ? (
    children
  ) : (
    <Navigate to="/admin" replace />
  );
}

function NotificationPopover({
  notifications,
  onChanged,
  onClose,
}: {
  notifications: ReturnType<typeof useAdmin>["notifications"];
  onChanged: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  return (
    <section className="admin-notification-popover" aria-label="Notifications">
      <header>
        <div>
          <p className="admin-eyebrow">Inbox</p>
          <h2>Notifications</h2>
        </div>
        <button
          type="button"
          onClick={async () => {
            await adminApi.markAllNotificationsRead();
            onChanged();
          }}
        >
          Mark all read
        </button>
      </header>
      <div className="admin-notification-list">
        {notifications.length === 0 ? (
          <p className="admin-notification-empty">You’re all caught up.</p>
        ) : (
          notifications.slice(0, 12).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={async () => {
                await adminApi.updateNotification(item.id, "read");
                onChanged();
                onClose();
                if (item.href) navigate(item.href);
              }}
            >
              <span className="admin-notification-dot" />
              <span>
                <strong>{item.title}</strong>
                <small>{item.body}</small>
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function CommandPalette({
  items,
  onClose,
  onSelect,
}: {
  items: typeof navigation;
  onClose: () => void;
  onSelect: (path: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    const listener = (event: KeyboardEvent) =>
      event.key === "Escape" && onClose();
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onClose]);
  return (
    <div
      className="admin-command-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="admin-command"
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
      >
        <label>
          <Icon name="compass" size={20} />
          <span className="u-visually-hidden">Search commands</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Where would you like to go?"
          />
          <kbd>Esc</kbd>
        </label>
        <div>
          <p>Jump to</p>
          {filtered.map((item, index) => (
            <button
              key={item.to}
              type="button"
              autoFocus={index === 0 && query.length > 0}
              onClick={() => onSelect(item.to)}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              <Icon name="arrow" size={15} />
            </button>
          ))}
          {!filtered.length && (
            <span className="admin-command-empty">No matching destination</span>
          )}
        </div>
      </section>
    </div>
  );
}
