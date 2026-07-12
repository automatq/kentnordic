import { createElement, useEffect, useRef } from "react";
import { useCopyContext } from "@/copy/CopyProvider";

interface EditableTextProps {
  copyKey: string;
  defaultValue: string;
  as?: React.ElementType;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  [key: string]: unknown;
}

export default function EditableText({
  copyKey,
  defaultValue,
  as = "span",
  className = "",
  multiline = false,
  placeholder = "",
  ...rest
}: EditableTextProps) {
  const Tag = as;
  const { get, save, isAdmin, editMode } = useCopyContext();
  const value = get(copyKey, defaultValue);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.textContent = value;
    }
  }, [value]);

  if (!isAdmin || !editMode) {
    return createElement(
      Tag,
      { className, ...rest },
      value || placeholder,
    );
  }

  const onBlur = (event: React.FocusEvent<HTMLElement>) => {
    const next = (
      multiline ? event.currentTarget.innerText : event.currentTarget.textContent
    )?.trimEnd() || "";
    if (next !== value) void save(copyKey, next);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (
      event.key === "Enter" &&
      multiline &&
      (event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.textContent = value;
      event.currentTarget.blur();
    }
  };

  return createElement(
    Tag,
    {
      ref,
      contentEditable: true,
      suppressContentEditableWarning: true,
      spellCheck: true,
      "data-copy-key": copyKey,
      className: `${className} idc-editable`.trim(),
      onBlur,
      onKeyDown,
      ...rest,
    },
    value,
  );
}
