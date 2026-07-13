import { useId, useRef, useState } from "react";

import Pic from "@/components/ui/Pic";
import { useCopyContext } from "@/copy/CopyProvider";

interface EditablePhotoProps {
  photoKey: string | undefined;
  alt: string;
  className?: string;
  frameClassName?: string;
  editMediaClassName?: string;
  sizes?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
}

function photoOverrideKey(photoKey: string | undefined) {
  return photoKey ? `photo.${photoKey}` : "";
}

export default function EditablePhoto({
  photoKey,
  alt,
  className = "",
  frameClassName = "",
  editMediaClassName = "idc-edit-photo-fill",
  sizes = "100vw",
  loading = "lazy",
  fetchPriority,
}: EditablePhotoProps) {
  const { get, isAdmin, editMode, savePhoto, resetPhoto } = useCopyContext();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const overrideKey = photoOverrideKey(photoKey);
  const overrideUrl = overrideKey ? get(overrideKey, "") : "";

  const openPicker = () => inputRef.current?.click();

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !photoKey) return;

    setUploading(true);
    try {
      await savePhoto(photoKey, file);
    } finally {
      setUploading(false);
    }
  }

  async function onReset(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!photoKey || !overrideUrl) return;
    if (!window.confirm("Reset this photo to the bundled default?")) return;
    await resetPhoto(photoKey);
  }

  function renderMedia(mediaClassName: string) {
    if (overrideUrl) {
      return (
        <img
          src={overrideUrl}
          alt={alt}
          className={mediaClassName}
          sizes={sizes}
          loading={loading}
          fetchPriority={fetchPriority}
        />
      );
    }

    return (
      <Pic
        photoKey={photoKey}
        alt={alt}
        className={mediaClassName}
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
      />
    );
  }

  if (!isAdmin || !editMode || !photoKey) {
    return renderMedia(className);
  }

  return (
    <span
      className={`idc-edit-photo-frame ${frameClassName}`.trim()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {renderMedia(`idc-edit-photo-media ${editMediaClassName}`.trim())}
      <span
        className={`idc-edit-photo-overlay ${uploading ? "is-visible" : ""}`.trim()}
      >
        <span className="idc-edit-photo-actions">
          {uploading ? (
            <span className="idc-edit-photo-status">Uploading...</span>
          ) : (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openPicker();
                }}
              >
                Replace
              </button>
              {overrideUrl && (
                <button
                  type="button"
                  className="is-secondary"
                  onClick={onReset}
                >
                  Reset
                </button>
              )}
            </>
          )}
        </span>
      </span>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="idc-edit-photo-input"
        onChange={onFileChange}
      />
    </span>
  );
}
