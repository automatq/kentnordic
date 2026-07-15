import { useLocation, useNavigate } from "react-router-dom";
import { useCopyContext } from "@/copy/CopyProvider";

export default function EditModeToolbar() {
  const { isAdmin, editMode, previewEntryId, previewMode, toggleEditMode, toast } = useCopyContext();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAdmin || location.pathname.startsWith("/admin")) return null;

  async function onLogout() {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    navigate("/admin", { replace: true });
    window.location.reload();
  }

  return (
    <>
      <div className="idc-edit-toolbar">
        <span
          className={`idc-edit-dot ${editMode ? "is-active" : ""}`}
          aria-hidden="true"
        />
        <span className="idc-edit-label">
          {previewMode ? "Draft preview" : editMode ? "Editing" : "View mode"}
          <span className="idc-edit-divider">·</span>
          <span className="idc-edit-path">{location.pathname}</span>
        </span>
        {previewMode && previewEntryId ? <button type="button" onClick={() => navigate(`/admin/content/${previewEntryId}`)}>Back to editor</button> : <button type="button" onClick={toggleEditMode}>{editMode ? "Stop editing" : "Start editing"}</button>}
        <button type="button" onClick={onLogout} className="is-secondary">
          Log out
        </button>
      </div>

      {toast && (
        <div
          className={`idc-edit-toast ${
            toast.kind === "err" ? "is-error" : ""
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
