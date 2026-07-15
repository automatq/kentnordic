import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  AdminNotification,
  AdminSession,
} from "../../shared/admin-contracts";
import { adminApi } from "./api";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

interface AdminContextValue {
  session: AdminSession;
  setSession: React.Dispatch<React.SetStateAction<AdminSession>>;
  notifications: AdminNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  notify: (message: string, tone?: Toast["tone"]) => void;
  toast: Toast | null;
  clearToast: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({
  initialSession,
  children,
}: {
  initialSession: AdminSession;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState(initialSession);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [browserAlerts, setBrowserAlerts] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastId = useRef(0);
  const toastTimer = useRef<number | null>(null);
  const seenNotifications = useRef<Set<string> | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!session.authenticated) return;
    try {
      const result = await adminApi.notifications(false);
      setNotifications(result.notifications);
      if (
        seenNotifications.current &&
        browserAlerts &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        for (const item of result.notifications) {
          if (!seenNotifications.current.has(item.id)) {
            const alert = new Notification(item.title, {
              body: item.body,
              tag: item.id,
            });
            alert.onclick = () => {
              window.focus();
              if (item.href) window.location.assign(item.href);
              alert.close();
            };
          }
        }
      }
      seenNotifications.current = new Set(
        result.notifications.map((item) => item.id),
      );
    } catch {
      // Notifications are supportive; page data errors remain visible in-page.
    }
  }, [browserAlerts, session.authenticated]);

  useEffect(() => {
    if (!session.authenticated) {
      setNotifications([]);
      seenNotifications.current = null;
      return;
    }
    void adminApi
      .preferences()
      .then((result) => setBrowserAlerts(result.preferences.browser))
      .catch(() => setBrowserAlerts(false));
    void refreshNotifications();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshNotifications();
    }, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshNotifications();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshNotifications, session.authenticated]);

  const notify = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      toastId.current += 1;
      setToast({ id: toastId.current, message, tone });
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 4_000);
    },
    [],
  );

  const value = useMemo(
    () => ({
      session,
      setSession,
      notifications,
      unreadCount: notifications.filter((item) => !item.readAt).length,
      refreshNotifications,
      notify,
      toast,
      clearToast: () => setToast(null),
    }),
    [notifications, notify, refreshNotifications, session, toast],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used inside AdminProvider.");
  return context;
}
