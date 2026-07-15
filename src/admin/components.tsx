import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import type { AdminProfile, LeadPriority } from "../../shared/admin-contracts";
import Icon from "@/components/ui/Icon";

export function AdminAvatar({
  profile,
  size = "md",
}: {
  profile: AdminProfile;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={`admin-avatar admin-avatar--${size}`}
      style={{ "--avatar-color": profile.color } as React.CSSProperties}
      aria-hidden="true"
    >
      {initials(profile.name)}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}

export function AdminButton({
  children,
  tone = "secondary",
  icon,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "quiet" | "danger";
  icon?: string;
}) {
  return (
    <button
      className={`admin-button admin-button--${tone} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} size={17} />}
      <span>{children}</span>
    </button>
  );
}

export function AdminLinkButton({
  to,
  children,
  tone = "secondary",
  icon,
}: {
  to: string;
  children: React.ReactNode;
  tone?: "primary" | "secondary" | "quiet";
  icon?: string;
}) {
  return (
    <Link className={`admin-button admin-button--${tone}`} to={to}>
      {icon && <Icon name={icon} size={17} />}
      <span>{children}</span>
    </Link>
  );
}

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  return (
    <span className={`admin-priority admin-priority--${priority}`}>
      {capitalize(priority)}
    </span>
  );
}

export function StatusBadge({
  label,
  color,
  tone,
}: {
  label: string;
  color?: string;
  tone?: "success" | "warning" | "danger" | "neutral" | "accent";
}) {
  return (
    <span
      className={`admin-status ${tone ? `admin-status--${tone}` : ""}`}
      style={
        color ? ({ "--status-color": color } as React.CSSProperties) : undefined
      }
    >
      <span aria-hidden="true" />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon = "compass",
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
  icon?: string;
}) {
  return (
    <div className="admin-empty">
      <Icon name={icon} size={28} />
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="admin-loading" role="status">
      <span className="admin-spinner" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="admin-error" role="alert">
      <div>
        <strong>Something needs attention</strong>
        <p>{message}</p>
      </div>
      {onRetry && <AdminButton onClick={onRetry}>Try again</AdminButton>}
    </div>
  );
}

export function Metric({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "default" | "accent" | "warning";
}) {
  return (
    <div className={`admin-metric admin-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onClose, open]);
  if (!open) return null;
  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={`admin-modal ${wide ? "admin-modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        <header>
          <div>
            <h2 id="admin-modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            ref={closeRef}
            className="admin-icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="admin-modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function RelativeTime({ value }: { value: string }) {
  const date = new Date(value);
  return (
    <time dateTime={value} title={date.toLocaleString()}>
      {relativeTime(date)}
    </time>
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function relativeTime(date: Date) {
  const seconds = Math.round((date.getTime() - Date.now()) / 1_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  return formatter.format(Math.round(days / 30), "month");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
