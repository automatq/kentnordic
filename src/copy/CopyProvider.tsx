import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface CopyToast {
  message: string;
  kind: "ok" | "err";
}

interface CopyContextValue {
  get: (key: string, defaultValue: string) => string;
  save: (key: string, value: string) => Promise<void>;
  reset: (key: string) => Promise<void>;
  savePhoto: (photoKey: string, file: File) => Promise<void>;
  resetPhoto: (photoKey: string) => Promise<void>;
  isAdmin: boolean;
  editMode: boolean;
  toggleEditMode: () => void;
  toast: CopyToast | null;
}

const CopyContext = createContext<CopyContextValue | null>(null);

export function CopyProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState<CopyToast | null>(null);
  const toastTimer = useRef<number | null>(null);

  const loadOverrides = useCallback(async () => {
    const map = await fetch("/api/copy")
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));
    setOverrides(map);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/copy")
      .then((res) => (res.ok ? res.json() : {}))
      .then((map) => {
        if (!cancelled) setOverrides(map);
      })
      .catch(() => {
        // Best-effort; defaults still render.
      });

    fetch("/api/admin/session", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((session) => {
        if (cancelled) return;
        const authed = Boolean(session?.authenticated);
        setIsAdmin(authed);
        if (!authed) setEditMode(false);
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(false);
          setEditMode(false);
        }
      });

    return () => {
      cancelled = true;
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((message: string, kind: "ok" | "err" = "ok") => {
    setToast({ message, kind });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const get = useCallback(
    (key: string, defaultValue: string) =>
      Object.prototype.hasOwnProperty.call(overrides, key)
        ? overrides[key]
        : defaultValue,
    [overrides],
  );

  const save = useCallback(
    async (key: string, value: string) => {
      if (!isAdmin) return;
      setOverrides((current) => ({ ...current, [key]: value }));
      try {
        const res = await fetch(`/api/admin/copy/${encodeURIComponent(key)}`, {
          method: "PUT",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ value }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        showToast("Saved");
      } catch (error) {
        showToast(
          `Save failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "err",
        );
        await loadOverrides();
      }
    },
    [isAdmin, loadOverrides, showToast],
  );

  const reset = useCallback(
    async (key: string) => {
      if (!isAdmin) return;
      setOverrides((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      try {
        const res = await fetch(`/api/admin/copy/${encodeURIComponent(key)}`, {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        showToast("Reset to default");
      } catch (error) {
        showToast(
          `Reset failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "err",
        );
      }
    },
    [isAdmin, showToast],
  );

  const savePhoto = useCallback(
    async (photoKey: string, file: File) => {
      if (!isAdmin) return;
      try {
        const res = await fetch(
          `/api/admin/photos/${encodeURIComponent(photoKey)}`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
              "Content-Type": file.type || "application/octet-stream",
              "X-Upload-Filename": file.name,
            },
            body: file,
          },
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const overrideKey = `photo.${photoKey}`;
        setOverrides((current) => ({ ...current, [overrideKey]: data.url }));
        showToast("Saved");
      } catch (error) {
        showToast(
          `Save failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "err",
        );
      }
    },
    [isAdmin, showToast],
  );

  const resetPhoto = useCallback(
    async (photoKey: string) => {
      if (!isAdmin) return;
      const overrideKey = `photo.${photoKey}`;
      const previous = overrides[overrideKey];
      setOverrides((current) => {
        const next = { ...current };
        delete next[overrideKey];
        return next;
      });

      try {
        const res = await fetch(
          `/api/admin/photos/${encodeURIComponent(photoKey)}`,
          {
            method: "DELETE",
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        showToast("Reset to default");
      } catch (error) {
        if (typeof previous === "string") {
          setOverrides((current) => ({ ...current, [overrideKey]: previous }));
        }
        showToast(
          `Reset failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "err",
        );
      }
    },
    [isAdmin, overrides, showToast],
  );

  const value = useMemo<CopyContextValue>(
    () => ({
      get,
      save,
      reset,
      savePhoto,
      resetPhoto,
      isAdmin,
      editMode,
      toggleEditMode: () => setEditMode((current) => !current),
      toast,
    }),
    [editMode, get, isAdmin, reset, resetPhoto, save, savePhoto, toast],
  );

  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

export function useCopyContext() {
  const context = useContext(CopyContext);
  if (!context) {
    throw new Error("useCopyContext must be used within CopyProvider.");
  }
  return context;
}
