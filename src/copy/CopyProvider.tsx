import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { upload } from "@vercel/blob/client";
import {
  clearAdminContentPreview,
  getPublishedCopyOverrides,
  hasPublishedContentRelease,
  setAdminContentPreview,
} from "@/lib/content";

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
  previewMode: boolean;
  previewEntryId: string | null;
  previewVersion: number;
  toggleEditMode: () => void;
  toast: CopyToast | null;
}

const CopyContext = createContext<CopyContextValue | null>(null);

export function CopyProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, string>>(
    getPublishedCopyOverrides,
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewEntryId, setPreviewEntryId] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [toast, setToast] = useState<CopyToast | null>(null);
  const toastTimer = useRef<number | null>(null);

  const loadOverrides = useCallback(async () => {
    if (hasPublishedContentRelease()) {
      setOverrides(getPublishedCopyOverrides());
      return;
    }
    const map = await fetch("/api/copy")
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}));
    setOverrides({ ...getPublishedCopyOverrides(), ...map });
  }, []);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const entryId = parameters.get("entry");
    if (parameters.get("preview") !== "admin" || !entryId) return;
    let cancelled = false;

    fetch(`/api/admin/content/${encodeURIComponent(entryId)}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Unable to load the draft preview.");
        return data;
      })
      .then((result) => {
        if (cancelled) return;
        const entry = result?.detail?.entry;
        if (!entry || typeof entry.key !== "string" || !entry.draft || typeof entry.draft !== "object") {
          throw new Error("The draft preview response is incomplete.");
        }
        setAdminContentPreview(entry.key, entry.draft as Record<string, unknown>);
        setOverrides(getPublishedCopyOverrides());
        setPreviewEntryId(entry.id);
        setPreviewMode(true);
        setPreviewVersion((version) => version + 1);
      })
      .catch((error) => {
        if (!cancelled) setToast({ message: error instanceof Error ? error.message : "Unable to load draft preview.", kind: "err" });
      });

    return () => {
      cancelled = true;
      clearAdminContentPreview();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!hasPublishedContentRelease()) {
      fetch("/api/copy")
        .then((res) => (res.ok ? res.json() : {}))
        .then((map) => {
          if (!cancelled)
            setOverrides({ ...getPublishedCopyOverrides(), ...map });
        })
        .catch(() => {
          // Best-effort; repository defaults still render.
        });
    }

    fetch("/api/admin/session", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((session) => {
        if (cancelled) return;
        const roles = Array.isArray(session?.profile?.roles)
          ? session.profile.roles
          : [];
        const authed =
          Boolean(session?.authenticated) &&
          (roles.includes("editor") || roles.includes("owner"));
        setIsAdmin(authed);
        setCsrfToken(typeof session?.csrfToken === "string" ? session.csrfToken : "");
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
            "X-Admin-CSRF": csrfToken,
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
    [csrfToken, isAdmin, loadOverrides, showToast],
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
          headers: {
            Accept: "application/json",
            "X-Admin-CSRF": csrfToken,
          },
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
    [csrfToken, isAdmin, showToast],
  );

  const savePhoto = useCallback(
    async (photoKey: string, file: File) => {
      if (!isAdmin) return;
      try {
        const blob = await upload(
          `media/originals/${safeFilename(file.name)}`,
          file,
          {
            access: "public",
            handleUploadUrl: "/api/admin/media-upload",
            clientPayload: JSON.stringify({
              alt: humanizePhotoKey(photoKey),
              filename: file.name,
            }),
            headers: { "X-Admin-CSRF": csrfToken },
          },
        );
        const overrideKey = `photo.${photoKey}`;
        const response = await fetch(
          `/api/admin/copy/${encodeURIComponent(overrideKey)}`,
          {
            method: "PUT",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-Admin-CSRF": csrfToken,
            },
            body: JSON.stringify({ value: blob.url }),
          },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        setOverrides((current) => ({ ...current, [overrideKey]: blob.url }));
        showToast("Image saved as a draft");
      } catch (error) {
        showToast(
          `Save failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "err",
        );
      }
    },
    [csrfToken, isAdmin, showToast],
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
          `/api/admin/copy/${encodeURIComponent(overrideKey)}`,
          {
            method: "DELETE",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
              "X-Admin-CSRF": csrfToken,
            },
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        showToast("Image draft reset");
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
    [csrfToken, isAdmin, overrides, showToast],
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
      previewMode,
      previewEntryId,
      previewVersion,
      toggleEditMode: () => setEditMode((current) => !current),
      toast,
    }),
    [editMode, get, isAdmin, previewEntryId, previewMode, previewVersion, reset, resetPhoto, save, savePhoto, toast],
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

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}

function humanizePhotoKey(value: string) {
  return value.replace(/[._-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
