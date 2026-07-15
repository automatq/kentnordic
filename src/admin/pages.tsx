import { upload } from "@vercel/blob/client";
import {
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import type {
  AdminDashboard,
  AdminProfile,
  ContentEntry,
  ContentKind,
  ContentRelease,
  EmailMessage,
  Lead,
  LeadAnalytics,
  LeadEvent,
  LeadPriority,
  LeadStage,
  MediaAsset,
  ProfileRole,
  Task,
} from "../../shared/admin-contracts";
import Icon from "@/components/ui/Icon";
import { adminApi, adminCsrfToken, adminExportUrl, AdminApiError } from "./api";
import {
  AdminAvatar,
  AdminButton,
  AdminLinkButton,
  EmptyState,
  ErrorBanner,
  FormField,
  formatDate,
  LoadingState,
  Metric,
  Modal,
  PageHeader,
  PriorityBadge,
  RelativeTime,
  StatusBadge,
} from "./components";
import { useAdmin } from "./context";

type LoadState = "loading" | "ready" | "error";

export function OverviewPage() {
  const { session } = useAdmin();
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await adminApi.dashboard();
      setData(result.dashboard);
      setState("ready");
    } catch (caught) {
      setError(messageOf(caught));
      setState("error");
    }
  }, []);
  useEffect(() => void load(), [load]);

  if (state === "loading")
    return <LoadingState label="Preparing your overview" />;
  if (state === "error" || !data)
    return <ErrorBanner message={error} onRetry={() => void load()} />;

  const canSales = hasRole(session.profile?.roles, "sales", "owner");
  const attention = [
    {
      label: "New leads",
      value: data.counts.newLeads,
      to: "/admin/leads",
      tone: "accent" as const,
    },
    {
      label: "Unassigned",
      value: data.counts.unassignedLeads,
      to: "/admin/leads?owner=unassigned",
      tone: "warning" as const,
    },
    {
      label: "SLA breaches",
      value: data.counts.slaBreaches,
      to: "/admin/leads",
      tone: "warning" as const,
    },
    {
      label: "Overdue follow-ups",
      value: data.counts.overdueTasks,
      to: "/admin/work",
      tone: "warning" as const,
    },
    {
      label: "Unread mentions",
      value: data.counts.unreadMentions,
      to: "/admin/leads",
      tone: "accent" as const,
    },
    {
      label: "Failed emails",
      value: data.counts.failedEmails,
      to: "/admin/leads",
      tone: "warning" as const,
    },
    {
      label: "Draft content",
      value: data.counts.draftContent,
      to: "/admin/content",
      tone: "default" as const,
    },
  ].filter(
    (item) =>
      item.value > 0 &&
      (item.to === "/admin/content"
        ? hasRole(session.profile?.roles, "editor", "owner")
        : canSales),
  );

  return (
    <div className="admin-page">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("en", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date())}
        title={`Good ${dayPart()}, ${firstName(session.profile?.name || "there")}`}
        description="Here’s what needs attention across sales and the website."
        actions={
          canSales ? (
            <AdminLinkButton to="/admin/leads" tone="primary" icon="group">
              Open pipeline
            </AdminLinkButton>
          ) : (
            <AdminLinkButton to="/admin/content" tone="primary" icon="pen">
              Manage content
            </AdminLinkButton>
          )
        }
      />

      <section className="admin-section" aria-labelledby="attention-title">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Priority queue</p>
            <h2 id="attention-title">Needs attention</h2>
          </div>
          <span>
            {attention.reduce((total, item) => total + item.value, 0)} items
          </span>
        </div>
        {attention.length ? (
          <div className="admin-attention-list">
            {attention.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={`admin-attention-row admin-attention-row--${item.tone}`}
              >
                <span className="admin-attention-value">{item.value}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{attentionDetail(item.label)}</small>
                </span>
                <Icon name="arrow" size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Everything is in good shape"
            message="There are no urgent sales, email, or publishing issues right now."
            icon="check"
          />
        )}
      </section>

      {canSales && (
        <div className="admin-overview-grid">
          <section
            className="admin-panel admin-panel--wide"
            aria-labelledby="recent-leads-title"
          >
            <div className="admin-panel-heading">
              <div>
                <p className="admin-eyebrow">Pipeline</p>
                <h2 id="recent-leads-title">Recent leads</h2>
              </div>
              <Link to="/admin/leads">View all</Link>
            </div>
            {data.recentLeads.length ? (
              <LeadTable leads={data.recentLeads} compact />
            ) : (
              <EmptyState
                title="No leads yet"
                message="New public inquiries will appear here."
                icon="group"
              />
            )}
          </section>
          <section className="admin-panel" aria-labelledby="upcoming-title">
            <div className="admin-panel-heading">
              <div>
                <p className="admin-eyebrow">Next up</p>
                <h2 id="upcoming-title">My work</h2>
              </div>
              <Link to="/admin/work">View all</Link>
            </div>
            <div className="admin-compact-list">
              {data.upcomingTasks.slice(0, 6).map((task) => (
                <Link
                  key={task.id}
                  to={
                    task.leadId ? `/admin/leads/${task.leadId}` : "/admin/work"
                  }
                >
                  <span className={isOverdue(task.dueAt) ? "is-overdue" : ""}>
                    <Icon name="check" size={15} />
                  </span>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{formatDate(task.dueAt)}</small>
                  </span>
                </Link>
              ))}
              {!data.upcomingTasks.length && (
                <p className="admin-muted-copy">
                  No open tasks. Enjoy the breathing room.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      <div className="admin-overview-grid">
        {canSales && (
          <section className="admin-panel" aria-labelledby="activity-title">
            <div className="admin-panel-heading">
              <div>
                <p className="admin-eyebrow">Team</p>
                <h2 id="activity-title">Recent activity</h2>
              </div>
            </div>
            <Timeline events={data.recentActivity.slice(0, 6)} />
          </section>
        )}
        {hasRole(session.profile?.roles, "editor", "owner") && (
          <section className="admin-panel" aria-labelledby="release-title">
            <div className="admin-panel-heading">
              <div>
                <p className="admin-eyebrow">Website</p>
                <h2 id="release-title">Publishing</h2>
              </div>
              <Link to="/admin/content">Manage</Link>
            </div>
            {data.latestRelease ? (
              <div className="admin-release-summary">
                <StatusBadge
                  label={data.latestRelease.status}
                  tone={releaseTone(data.latestRelease.status)}
                />
                <strong>Release {data.latestRelease.number}</strong>
                <p>{data.latestRelease.note || "Website content release"}</p>
                <small>
                  Created {formatDate(data.latestRelease.createdAt)}
                </small>
              </div>
            ) : (
              <p className="admin-muted-copy">
                No database-backed release has been published yet.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

interface LeadFilters {
  q: string;
  stage: string;
  owner: string;
  priority: string;
  source: string;
  formType: string;
  country: string;
  packageCode: string;
  travelDates: string;
  customFieldKey: string;
  customFieldValue: string;
  due: string;
}

const emptyLeadFilters: LeadFilters = {
  q: "",
  stage: "",
  owner: "",
  priority: "",
  source: "",
  formType: "",
  country: "",
  packageCode: "",
  travelDates: "",
  customFieldKey: "",
  customFieldValue: "",
  due: "",
};
const leadColumns = [
  "contact",
  "organization",
  "stage",
  "owner",
  "priority",
  "nextAction",
  "created",
] as const;
type LeadColumn = (typeof leadColumns)[number];

export function LeadsPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [filters, setFilters] = useState<LeadFilters>(() => ({
    ...emptyLeadFilters,
    ...Object.fromEntries(new URLSearchParams(location.search)),
  }));
  const deferredQuery = useDeferredValue(filters.q);
  const [view, setView] = useState<"list" | "board">(() =>
    localStorage.getItem("admin.leads.view") === "board" ? "board" : "list",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<LeadColumn[]>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("admin.leads.columns") || "null") || [
          ...leadColumns,
        ]
      );
    } catch {
      return [...leadColumns];
    }
  });
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<
    Array<{
      id: string;
      name: string;
      filters: Record<string, unknown>;
      columns: string[];
      sort: string;
    }>
  >([]);
  const [customFields, setCustomFields] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(
    async (append = false, cursor?: string) => {
      if (!append) setState("loading");
      setError("");
      try {
        const result = await adminApi.leads({
          ...filters,
          q: deferredQuery,
          cursor,
          limit: view === "board" ? 100 : 50,
        });
        setLeads((current) =>
          append ? [...current, ...result.page.items] : result.page.items,
        );
        setNextCursor(result.page.nextCursor);
        setState("ready");
      } catch (caught) {
        setError(messageOf(caught));
        setState("error");
      }
    },
    [
      deferredQuery,
      filters.country,
      filters.customFieldKey,
      filters.customFieldValue,
      filters.due,
      filters.formType,
      filters.owner,
      filters.packageCode,
      filters.priority,
      filters.source,
      filters.stage,
      filters.travelDates,
      view,
    ],
  );

  useEffect(() => {
    void Promise.all([
      adminApi.stages(),
      adminApi.profiles(),
      adminApi.savedViews(),
      adminApi.customFields(),
    ])
      .then(([stageResult, profileResult, viewResult, fieldResult]) => {
        setStages(stageResult.stages);
        setProfiles(profileResult.profiles.filter((profile) => profile.active));
        setSavedViews(viewResult.views);
        setCustomFields(fieldResult.fields);
      })
      .catch((caught) => setError(messageOf(caught)));
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  function updateFilter<K extends keyof LeadFilters>(
    key: K,
    value: LeadFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setSelected(new Set());
  }

  async function bulkUpdate(
    patch:
      | { stageId?: string; ownerId?: string | null; priority?: LeadPriority }
      | ((lead: Lead) => Record<string, unknown>),
  ) {
    setBulkBusy(true);
    setError("");
    try {
      for (const lead of leads.filter((item) => selected.has(item.id))) {
        await adminApi.updateLead(lead.id, {
          version: lead.version,
          ...(typeof patch === "function" ? patch(lead) : patch),
        });
      }
      setSelected(new Set());
      await load();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="admin-page admin-page--flush-mobile">
      <PageHeader
        eyebrow="Sales CRM"
        title="Leads"
        description="Search, prioritize, and move every inquiry toward a clear next step."
        actions={
          <>
            <a
              className="admin-button admin-button--secondary"
              href={adminExportUrl({ ...filters })}
            >
              <Icon name="arrow-down" size={17} />
              <span>Export CSV</span>
            </a>
            <AdminButton
              tone="primary"
              icon="plus"
              onClick={() => document.getElementById("lead-search")?.focus()}
            >
              Find a lead
            </AdminButton>
          </>
        }
      />
      <section className="admin-filter-bar" aria-label="Lead filters">
        <label className="admin-search-field">
          <Icon name="compass" size={17} />
          <span className="u-visually-hidden">Search leads</span>
          <input
            id="lead-search"
            value={filters.q}
            onChange={(event) => updateFilter("q", event.target.value)}
            placeholder="Search name, company, email, package…"
          />
        </label>
        <select
          aria-label="Stage"
          value={filters.stage}
          onChange={(event) => updateFilter("stage", event.target.value)}
        >
          <option value="">All stages</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Owner"
          value={filters.owner}
          onChange={(event) => updateFilter("owner", event.target.value)}
        >
          <option value="">All owners</option>
          <option value="unassigned">Unassigned</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Priority"
          value={filters.priority}
          onChange={(event) => updateFilter("priority", event.target.value)}
        >
          <option value="">All priorities</option>
          {(["urgent", "high", "normal", "low"] as const).map((priority) => (
            <option key={priority} value={priority}>
              {capitalize(priority)}
            </option>
          ))}
        </select>
        <select
          aria-label="Due date"
          value={filters.due}
          onChange={(event) => updateFilter("due", event.target.value)}
        >
          <option value="">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="upcoming">Upcoming</option>
        </select>
        <button
          className="admin-filter-more"
          type="button"
          onClick={() => setMoreFiltersOpen(true)}
        >
          More filters
          {[
            filters.source,
            filters.formType,
            filters.country,
            filters.packageCode,
            filters.travelDates,
            filters.customFieldValue,
          ].filter(Boolean).length
            ? ` (${[filters.source, filters.formType, filters.country, filters.packageCode, filters.travelDates, filters.customFieldValue].filter(Boolean).length})`
            : ""}
        </button>
        <button
          className="admin-filter-more"
          type="button"
          onClick={() => setFilters(emptyLeadFilters)}
          disabled={!Object.values(filters).some(Boolean)}
        >
          Clear
        </button>
      </section>
      <div className="admin-list-toolbar">
        <div className="admin-segmented" aria-label="Lead view">
          <button
            className={view === "list" ? "is-active" : ""}
            type="button"
            onClick={() => {
              setView("list");
              localStorage.setItem("admin.leads.view", "list");
            }}
          >
            <Icon name="menu" size={16} />
            List
          </button>
          <button
            className={view === "board" ? "is-active" : ""}
            type="button"
            onClick={() => {
              setView("board");
              localStorage.setItem("admin.leads.view", "board");
            }}
          >
            <Icon name="layers" size={16} />
            Board
          </button>
        </div>
        <div className="admin-toolbar-right">
          {savedViews.length > 0 && (
            <select
              aria-label="Saved views"
              defaultValue=""
              onChange={(event) => {
                const saved = savedViews.find(
                  (item) => item.id === event.target.value,
                );
                if (!saved) return;
                setFilters({
                  ...emptyLeadFilters,
                  ...saved.filters,
                } as LeadFilters);
                const nextColumns = saved.columns.filter(
                  (column): column is LeadColumn =>
                    leadColumns.includes(column as LeadColumn),
                );
                if (nextColumns.length) setColumns(nextColumns);
                event.currentTarget.value = "";
              }}
            >
              <option value="">Saved views…</option>
              {savedViews.map((saved) => (
                <option key={saved.id} value={saved.id}>
                  {saved.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={() => setSaveViewOpen(true)}>
            Save view
          </button>
          {view === "list" && (
            <button type="button" onClick={() => setColumnsOpen(true)}>
              Columns
            </button>
          )}
          <span>
            {leads.length}
            {nextCursor ? "+" : ""} lead{leads.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      {selected.size > 0 && (
        <div className="admin-bulk-bar" role="region" aria-label="Bulk actions">
          <strong>{selected.size} selected</strong>
          <select
            aria-label="Assign selected leads"
            disabled={bulkBusy}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value)
                void bulkUpdate({
                  ownerId:
                    event.target.value === "unassigned"
                      ? null
                      : event.target.value,
                });
              event.currentTarget.value = "";
            }}
          >
            <option value="">Assign…</option>
            <option value="unassigned">Unassigned</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Move selected leads"
            disabled={bulkBusy}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value)
                void bulkUpdate({ stageId: event.target.value });
              event.currentTarget.value = "";
            }}
          >
            <option value="">Move stage…</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Prioritize selected leads"
            disabled={bulkBusy}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value)
                void bulkUpdate({
                  priority: event.target.value as LeadPriority,
                });
              event.currentTarget.value = "";
            }}
          >
            <option value="">Priority…</option>
            {(["urgent", "high", "normal", "low"] as const).map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => {
              const tag = prompt("Tag to add to the selected leads:")?.trim();
              if (tag)
                void bulkUpdate((lead) => ({
                  tags: [...new Set([...lead.tags, tag])],
                }));
            }}
          >
            Add tag
          </button>
          <button type="button" onClick={() => setSelected(new Set())}>
            Clear
          </button>
          {bulkBusy && <span className="admin-spinner" />}
        </div>
      )}
      {state === "loading" ? (
        <LoadingState label="Loading leads" />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads match this view"
          message="Try clearing a filter or wait for the next inquiry."
          icon="group"
        />
      ) : view === "list" ? (
        <LeadTable
          leads={leads}
          columns={columns}
          selected={selected}
          onSelect={setSelected}
        />
      ) : (
        <LeadBoard
          leads={leads}
          stages={stages}
          onMoved={async (lead, stageId) => {
            await adminApi.updateLead(lead.id, {
              version: lead.version,
              stageId,
            });
            await load();
          }}
        />
      )}
      {nextCursor && (
        <div className="admin-load-more">
          <AdminButton
            onClick={() => void load(true, nextCursor)}
            disabled={state === "loading"}
          >
            Load 50 more
          </AdminButton>
        </div>
      )}

      <ColumnChooser
        open={columnsOpen}
        columns={columns}
        onClose={() => setColumnsOpen(false)}
        onChange={(next) => {
          setColumns(next);
          localStorage.setItem("admin.leads.columns", JSON.stringify(next));
        }}
      />
      <SaveViewModal
        open={saveViewOpen}
        onClose={() => setSaveViewOpen(false)}
        filters={filters}
        columns={columns}
      />
      <MoreLeadFilters
        open={moreFiltersOpen}
        onClose={() => setMoreFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        customFields={customFields}
      />
    </div>
  );
}

function MoreLeadFilters({
  open,
  onClose,
  filters,
  onChange,
  customFields,
}: {
  open: boolean;
  onClose: () => void;
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  customFields: Array<Record<string, unknown>>;
}) {
  const leadFields = customFields.filter(
    (field) => field.entity === "lead" && field.active,
  );
  return (
    <Modal
      open={open}
      title="More lead filters"
      description="Narrow the pipeline with inquiry, market, timing, and custom-field data."
      onClose={onClose}
      footer={
        <>
          <AdminButton
            onClick={() =>
              onChange({
                ...emptyLeadFilters,
                q: filters.q,
                stage: filters.stage,
                owner: filters.owner,
                priority: filters.priority,
                due: filters.due,
              })
            }
          >
            Clear extra filters
          </AdminButton>
          <AdminButton tone="primary" onClick={onClose}>
            Apply filters
          </AdminButton>
        </>
      }
    >
      <div className="admin-form-stack">
        <div className="admin-form-grid">
          <FormField label="Source">
            <input
              value={filters.source}
              onChange={(event) =>
                onChange({ ...filters, source: event.target.value })
              }
              placeholder="website, partner, campaign…"
            />
          </FormField>
          <FormField label="Form">
            <select
              value={filters.formType}
              onChange={(event) =>
                onChange({ ...filters, formType: event.target.value })
              }
            >
              <option value="">Any form</option>
              <option value="inquiry">Inquiry</option>
              <option value="rate-sheet">Rate sheet</option>
            </select>
          </FormField>
          <FormField label="Country / market">
            <input
              value={filters.country}
              onChange={(event) =>
                onChange({ ...filters, country: event.target.value })
              }
            />
          </FormField>
          <FormField label="Package">
            <input
              value={filters.packageCode}
              onChange={(event) =>
                onChange({ ...filters, packageCode: event.target.value })
              }
            />
          </FormField>
          <FormField label="Travel dates contain">
            <input
              value={filters.travelDates}
              onChange={(event) =>
                onChange({ ...filters, travelDates: event.target.value })
              }
              placeholder="October 2026"
            />
          </FormField>
          {leadFields.length > 0 && (
            <FormField label="Custom field">
              <select
                value={filters.customFieldKey}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    customFieldKey: event.target.value,
                    customFieldValue: "",
                  })
                }
              >
                <option value="">Choose a field</option>
                {leadFields.map((field) => (
                  <option key={String(field.id)} value={String(field.key)}>
                    {String(field.label)}
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </div>
        {filters.customFieldKey && (
          <FormField label="Custom field value">
            <input
              value={filters.customFieldValue}
              onChange={(event) =>
                onChange({ ...filters, customFieldValue: event.target.value })
              }
            />
          </FormField>
        )}
      </div>
    </Modal>
  );
}

function LeadTable({
  leads,
  columns = [...leadColumns],
  selected,
  onSelect,
  compact = false,
}: {
  leads: Lead[];
  columns?: LeadColumn[];
  selected?: Set<string>;
  onSelect?: (selected: Set<string>) => void;
  compact?: boolean;
}) {
  const shownColumns = compact
    ? (["contact", "stage", "owner", "created"] as LeadColumn[])
    : columns;
  const allSelected =
    !!selected &&
    leads.length > 0 &&
    leads.every((lead) => selected.has(lead.id));
  return (
    <div className="admin-table-wrap">
      <table className={`admin-table ${compact ? "admin-table--compact" : ""}`}>
        <thead>
          <tr>
            {selected && (
              <th className="admin-check-cell">
                <input
                  type="checkbox"
                  aria-label="Select all visible leads"
                  checked={allSelected}
                  onChange={(event) =>
                    onSelect?.(
                      event.target.checked
                        ? new Set(leads.map((lead) => lead.id))
                        : new Set(),
                    )
                  }
                />
              </th>
            )}
            {shownColumns.map((column) => (
              <th key={column}>{columnLabel(column)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              {selected && (
                <td className="admin-check-cell">
                  <input
                    type="checkbox"
                    aria-label={`Select ${lead.title}`}
                    checked={selected.has(lead.id)}
                    onChange={(event) => {
                      const next = new Set(selected);
                      event.target.checked
                        ? next.add(lead.id)
                        : next.delete(lead.id);
                      onSelect?.(next);
                    }}
                  />
                </td>
              )}
              {shownColumns.map((column) => (
                <LeadCell key={column} lead={lead} column={column} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadCell({ lead, column }: { lead: Lead; column: LeadColumn }) {
  if (column === "contact")
    return (
      <td className="admin-primary-cell">
        <Link to={`/admin/leads/${lead.id}`}>
          <strong>{lead.contact.name}</strong>
          <span>{lead.contact.email}</span>
        </Link>
        {lead.duplicate && (
          <span className="admin-duplicate">Possible duplicate</span>
        )}
      </td>
    );
  if (column === "organization")
    return (
      <td>
        <strong>{lead.organization.name}</strong>
        <span>{lead.contact.country || lead.organization.country || "—"}</span>
      </td>
    );
  if (column === "stage")
    return (
      <td>
        <StatusBadge label={lead.stage.name} color={lead.stage.color} />
      </td>
    );
  if (column === "owner")
    return (
      <td>
        {lead.owner ? (
          <span className="admin-owner-cell">
            <AdminAvatar profile={lead.owner} size="sm" />
            {lead.owner.name}
          </span>
        ) : (
          <span className="admin-unassigned">Unassigned</span>
        )}
      </td>
    );
  if (column === "priority")
    return (
      <td>
        <PriorityBadge priority={lead.priority} />
      </td>
    );
  if (column === "nextAction")
    return (
      <td
        className={
          lead.nextActionAt && isOverdue(lead.nextActionAt)
            ? "admin-overdue-text"
            : ""
        }
      >
        {lead.nextActionAt ? <RelativeTime value={lead.nextActionAt} /> : "—"}
      </td>
    );
  return (
    <td>
      <RelativeTime value={lead.createdAt} />
    </td>
  );
}

function LeadBoard({
  leads,
  stages,
  onMoved,
}: {
  leads: Lead[];
  stages: LeadStage[];
  onMoved: (lead: Lead, stageId: string) => Promise<void>;
}) {
  return (
    <div
      className="admin-board"
      role="region"
      aria-label="Pipeline board"
      tabIndex={0}
    >
      {stages
        .filter((stage) => stage.active)
        .map((stage) => {
          const items = leads.filter((lead) => lead.stage.id === stage.id);
          return (
            <section key={stage.id} className="admin-board-column">
              <header>
                <StatusBadge label={stage.name} color={stage.color} />
                <span>{items.length}</span>
              </header>
              <div>
                {items.map((lead) => (
                  <article key={lead.id} className="admin-board-card">
                    <Link to={`/admin/leads/${lead.id}`}>
                      <strong>{lead.contact.name}</strong>
                      <span>{lead.organization.name}</span>
                    </Link>
                    <p>{lead.summary || lead.message}</p>
                    <footer>
                      {lead.owner ? (
                        <AdminAvatar profile={lead.owner} size="sm" />
                      ) : (
                        <span className="admin-avatar-placeholder">?</span>
                      )}
                      <PriorityBadge priority={lead.priority} />
                      <select
                        aria-label={`Move ${lead.title}`}
                        value={lead.stage.id}
                        onChange={(event) =>
                          void onMoved(lead, event.target.value)
                        }
                      >
                        {stages.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </footer>
                  </article>
                ))}
                {!items.length && (
                  <span className="admin-board-empty">No leads</span>
                )}
              </div>
            </section>
          );
        })}
    </div>
  );
}

function ColumnChooser({
  open,
  columns,
  onClose,
  onChange,
}: {
  open: boolean;
  columns: LeadColumn[];
  onClose: () => void;
  onChange: (value: LeadColumn[]) => void;
}) {
  return (
    <Modal
      open={open}
      title="Choose columns"
      description="Keep the daily list concise. Your choice is saved on this device."
      onClose={onClose}
      footer={
        <AdminButton tone="primary" onClick={onClose}>
          Done
        </AdminButton>
      }
    >
      <div className="admin-checkbox-list">
        {leadColumns.map((column) => (
          <label key={column}>
            <input
              type="checkbox"
              checked={columns.includes(column)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...columns, column]
                    : columns.filter((item) => item !== column),
                )
              }
            />
            <span>{columnLabel(column)}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}

function SaveViewModal({
  open,
  onClose,
  filters,
  columns,
}: {
  open: boolean;
  onClose: () => void;
  filters: LeadFilters;
  columns: LeadColumn[];
}) {
  const { notify } = useAdmin();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await adminApi.saveView({
        name,
        filters: { ...filters },
        columns: [...columns],
        sort: "newest",
      });
      notify("Saved view created.");
      setName("");
      onClose();
    } catch (error) {
      notify(messageOf(error), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      title="Save this view"
      description="Reuse the current filters and columns whenever you need them."
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            tone="primary"
            disabled={!name.trim() || busy}
            onClick={() => void save()}
          >
            Save view
          </AdminButton>
        </>
      }
    >
      <FormField label="View name">
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Iceland winter groups"
        />
      </FormField>
    </Modal>
  );
}

interface CustomFieldDefinition {
  id: string;
  entity: "lead" | "contact" | "organization";
  label: string;
  key: string;
  type:
    | "text"
    | "number"
    | "date"
    | "boolean"
    | "url"
    | "single-select"
    | "multi-select";
  options: string[];
  required: boolean;
  active: boolean;
}

export function LeadDetailPage() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { session, notify, refreshNotifications } = useAdmin();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [lead, setLead] = useState<Lead | null>(null);
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<"note" | "call">("note");
  const [noteBusy, setNoteBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState<EmailMessage | null>(null);
  const [retryingEmailId, setRetryingEmailId] = useState<string | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [tagsEditing, setTagsEditing] = useState(false);
  const [tagValue, setTagValue] = useState("");

  const load = useCallback(async () => {
    if (!leadId) return;
    setState("loading");
    setError("");
    try {
      const [result, stageResult, profileResult, fieldResult] =
        await Promise.all([
          adminApi.lead(leadId),
          adminApi.stages(),
          adminApi.profiles(),
          adminApi.customFields(),
        ]);
      setLead(result.detail.lead);
      setEvents(result.detail.events);
      setTasks(result.detail.tasks);
      setEmails(result.detail.emails);
      setStages(stageResult.stages);
      setProfiles(profileResult.profiles.filter((profile) => profile.active));
      setCustomFields(
        fieldResult.fields
          .filter((field) => field.active)
          .map((field) => ({
            id: String(field.id),
            entity: String(field.entity) as CustomFieldDefinition["entity"],
            label: String(field.label),
            key: String(field.key),
            type: String(field.type) as CustomFieldDefinition["type"],
            options: Array.isArray(field.options)
              ? field.options.map(String)
              : [],
            required: Boolean(field.required),
            active: Boolean(field.active),
          })),
      );
      setTagValue(result.detail.lead.tags.join(", "));
      setState("ready");
    } catch (caught) {
      setError(messageOf(caught));
      setState("error");
    }
  }, [leadId]);
  useEffect(() => void load(), [load]);

  async function patch(values: Record<string, unknown>, success?: string) {
    if (!lead) return false;
    setError("");
    try {
      const result = await adminApi.updateLead(lead.id, {
        version: lead.version,
        ...values,
      });
      setLead(result.lead);
      if (success) notify(success);
      await refreshNotifications();
      return true;
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 409)
        await load();
      setError(messageOf(caught));
      return false;
    }
  }

  async function addNote() {
    if (!lead || !note.trim()) return;
    setNoteBusy(true);
    try {
      await adminApi.addEvent(lead.id, noteType, note);
      setNote("");
      await load();
      notify(noteType === "call" ? "Call logged." : "Note added.");
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setNoteBusy(false);
    }
  }

  async function retryEmail(email: EmailMessage) {
    if (!lead) return;
    setRetryingEmailId(email.id);
    setError("");
    try {
      await adminApi.retryEmail(lead.id, email.id);
      await load();
      notify("Email resent and added to the timeline.");
    } catch (caught) {
      const retryError = messageOf(caught);
      await load();
      setError(retryError);
    } finally {
      setRetryingEmailId(null);
    }
  }

  if (state === "loading") return <LoadingState label="Opening lead" />;
  if (state === "error" || !lead)
    return (
      <div className="admin-page">
        <ErrorBanner
          message={error || "Lead not found."}
          onRetry={() => void load()}
        />
      </div>
    );

  const openTasks = tasks.filter((task) => task.status === "open");
  return (
    <div className="admin-page admin-lead-page">
      <div className="admin-detail-back">
        <Link to="/admin/leads">
          <Icon name="arrow" size={16} />
          Back to leads
        </Link>
      </div>
      {error && <ErrorBanner message={error} />}
      {lead.duplicate && (
        <div className="admin-duplicate-banner">
          <Icon name="layers" size={20} />
          <div>
            <strong>Possible duplicate</strong>
            <p>
              This email or organization has another submission. Compare records
              before deciding whether to archive either lead.
            </p>
          </div>
        </div>
      )}
      <header className="admin-lead-header">
        <div>
          <div className="admin-lead-title-line">
            <StatusBadge label={lead.stage.name} color={lead.stage.color} />
            <PriorityBadge priority={lead.priority} />
          </div>
          <h1>{lead.contact.name}</h1>
          <p>
            {lead.organization.name} · {lead.contact.email}
          </p>
        </div>
        <div className="admin-page-actions">
          <AdminButton icon="check" onClick={() => setTaskOpen(true)}>
            Add task
          </AdminButton>
          <AdminButton
            tone="primary"
            icon="mail"
            onClick={() => {
              setEmailDraft(null);
              setEmailOpen(true);
            }}
          >
            Send email
          </AdminButton>
        </div>
      </header>

      <div className="admin-lead-layout">
        <div className="admin-lead-main">
          <section
            className="admin-panel admin-inquiry-brief"
            aria-labelledby="brief-heading"
          >
            <div className="admin-panel-heading">
              <div>
                <p className="admin-eyebrow">Inquiry brief</p>
                <h2 id="brief-heading">What they’re planning</h2>
              </div>
              <span>
                Received <RelativeTime value={lead.createdAt} />
              </span>
            </div>
            <dl className="admin-brief-grid">
              <DetailItem label="Package" value={lead.packageCode} />
              <DetailItem label="Travel dates" value={lead.travelDates} />
              <DetailItem label="Group size" value={lead.pax} />
              <DetailItem label="Travel type" value={lead.travelType} />
              <DetailItem
                label="Country"
                value={lead.contact.country || lead.organization.country}
              />
              <DetailItem label="Source" value={lead.source || lead.formType} />
            </dl>
            <div className="admin-message-block">
              <p>{lead.message}</p>
            </div>
            {lead.sourcePage && (
              <p className="admin-source-line">
                Source page:{" "}
                <a href={lead.sourcePage} target="_blank" rel="noreferrer">
                  {shortUrl(lead.sourcePage)}
                </a>
              </p>
            )}
          </section>

          <section className="admin-panel" aria-labelledby="timeline-heading">
            <div className="admin-panel-heading">
              <div>
                <p className="admin-eyebrow">Record</p>
                <h2 id="timeline-heading">Timeline</h2>
              </div>
              <span>Immutable activity</span>
            </div>
            <div className="admin-note-composer">
              <div className="admin-segmented">
                <button
                  type="button"
                  className={noteType === "note" ? "is-active" : ""}
                  onClick={() => setNoteType("note")}
                >
                  Note
                </button>
                <button
                  type="button"
                  className={noteType === "call" ? "is-active" : ""}
                  onClick={() => setNoteType("call")}
                >
                  Log call
                </button>
              </div>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={
                  noteType === "call"
                    ? "What was discussed? Add @name to notify a teammate."
                    : "Add context, a decision, or @mention a teammate…"
                }
                rows={3}
              />
              <div>
                <span>
                  {note.length
                    ? `${note.length} characters`
                    : "Visible to the team"}
                </span>
                <AdminButton
                  tone="primary"
                  disabled={!note.trim() || noteBusy}
                  onClick={() => void addNote()}
                >
                  {noteBusy
                    ? "Adding…"
                    : noteType === "call"
                      ? "Log call"
                      : "Add note"}
                </AdminButton>
              </div>
            </div>
            <Timeline
              events={events}
              emails={emails}
              retryingEmailId={retryingEmailId}
              onOpenDraft={(email) => {
                setEmailDraft(email);
                setEmailOpen(true);
              }}
              onRetryEmail={(email) => void retryEmail(email)}
            />
          </section>
        </div>

        <aside className="admin-lead-sidebar" aria-label="Lead properties">
          <section className="admin-panel">
            <h2>Lead details</h2>
            <FormField label="Stage">
              <select
                value={lead.stage.id}
                onChange={(event) =>
                  void patch({ stageId: event.target.value }, "Stage updated.")
                }
              >
                {stages
                  .filter((stage) => stage.active)
                  .map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
              </select>
            </FormField>
            <FormField label="Owner">
              <select
                value={lead.owner?.id || ""}
                onChange={(event) =>
                  void patch(
                    { ownerId: event.target.value || null },
                    "Owner updated.",
                  )
                }
              >
                <option value="">Unassigned</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Priority">
              <select
                value={lead.priority}
                onChange={(event) =>
                  void patch({ priority: event.target.value })
                }
              >
                {(["urgent", "high", "normal", "low"] as const).map(
                  (priority) => (
                    <option key={priority} value={priority}>
                      {capitalize(priority)}
                    </option>
                  ),
                )}
              </select>
            </FormField>
            <FormField label="Next action">
              <input
                type="datetime-local"
                value={toLocalInput(lead.nextActionAt)}
                onChange={(event) =>
                  void patch(
                    {
                      nextActionAt: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    },
                    "Next action updated.",
                  )
                }
              />
            </FormField>
            <div className="admin-property-block">
              <span>Tags</span>
              {tagsEditing ? (
                <div className="admin-inline-edit">
                  <input
                    autoFocus
                    value={tagValue}
                    onChange={(event) => setTagValue(event.target.value)}
                    placeholder="group, winter, vip"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void patch(
                        {
                          tags: tagValue
                            .split(",")
                            .map((tag) => tag.trim())
                            .filter(Boolean),
                        },
                        "Tags updated.",
                      );
                      setTagsEditing(false);
                    }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  className="admin-tag-list"
                  type="button"
                  onClick={() => setTagsEditing(true)}
                >
                  {lead.tags.length ? (
                    lead.tags.map((tag) => <span key={tag}>{tag}</span>)
                  ) : (
                    <em>Add tags</em>
                  )}
                </button>
              )}
            </div>
          </section>
          <section className="admin-panel admin-contact-card">
            <div className="admin-panel-heading">
              <h2>Contact</h2>
              {customFields.length > 0 && (
                <button type="button" onClick={() => setCustomFieldsOpen(true)}>
                  Edit fields
                </button>
              )}
            </div>
            <div>
              <span>Name</span>
              <strong>{lead.contact.name}</strong>
            </div>
            <div>
              <span>Email</span>
              <a href={`mailto:${lead.contact.email}`}>{lead.contact.email}</a>
            </div>
            <div>
              <span>Phone</span>
              {lead.contact.phone ? (
                <a href={`tel:${lead.contact.phone}`}>{lead.contact.phone}</a>
              ) : (
                <em>Not provided</em>
              )}
            </div>
            <div>
              <span>Organization</span>
              <strong>{lead.organization.name}</strong>
            </div>
            {customFields
              .filter((field) => hasCustomValue(customFieldValue(lead, field)))
              .map((field) => (
                <div key={field.id}>
                  <span>{field.label}</span>
                  <strong>
                    {formatCustomValue(customFieldValue(lead, field))}
                  </strong>
                </div>
              ))}
          </section>
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>Open tasks</h2>
              <button type="button" onClick={() => setTaskOpen(true)}>
                Add
              </button>
            </div>
            <div className="admin-task-mini-list">
              {openTasks.map((task) => (
                <label key={task.id}>
                  <input
                    type="checkbox"
                    onChange={async () => {
                      await adminApi.updateTask(task.id, {
                        status: "completed",
                      });
                      await load();
                      notify("Task completed.");
                    }}
                  />
                  <span>
                    <strong>{task.title}</strong>
                    <small
                      className={
                        isOverdue(task.dueAt) ? "admin-overdue-text" : ""
                      }
                    >
                      {formatDate(task.dueAt)}
                    </small>
                  </span>
                </label>
              ))}
              {!openTasks.length && (
                <p className="admin-muted-copy">No open tasks.</p>
              )}
            </div>
          </section>
          {session.profile?.roles.includes("owner") && (
            <button
              className="admin-danger-link"
              type="button"
              onClick={async () => {
                if (!confirm(`Move ${lead.contact.name} to 30-day trash?`))
                  return;
                await adminApi.trashLead(lead.id);
                notify("Lead moved to trash.");
                navigate("/admin/leads");
              }}
            >
              Move lead to trash
            </button>
          )}
        </aside>
      </div>
      <EmailComposer
        open={emailOpen}
        lead={lead}
        initialEmail={emailDraft}
        onClose={() => {
          setEmailOpen(false);
          setEmailDraft(null);
          void load();
        }}
        onComplete={async (action) => {
          setEmailOpen(false);
          setEmailDraft(null);
          await load();
          notify(
            action === "draft"
              ? "Email draft saved."
              : "Email sent and added to the timeline.",
          );
        }}
      />
      <TaskComposer
        open={taskOpen}
        lead={lead}
        profiles={profiles}
        onClose={() => setTaskOpen(false)}
        onCreated={async () => {
          setTaskOpen(false);
          await load();
          notify("Task created.");
        }}
      />
      <CustomFieldsEditor
        open={customFieldsOpen}
        lead={lead}
        fields={customFields}
        onClose={() => setCustomFieldsOpen(false)}
        onSave={async (values) => {
          const saved = await patch({ ...values }, "Custom fields updated.");
          if (saved) setCustomFieldsOpen(false);
        }}
      />
    </div>
  );
}

interface CustomFieldValues {
  customFields: Record<string, unknown>;
  contactCustomFields: Record<string, unknown>;
  organizationCustomFields: Record<string, unknown>;
}

function CustomFieldsEditor({
  open,
  lead,
  fields,
  onClose,
  onSave,
}: {
  open: boolean;
  lead: Lead;
  fields: CustomFieldDefinition[];
  onClose: () => void;
  onSave: (values: CustomFieldValues) => Promise<void>;
}) {
  const [values, setValues] = useState<CustomFieldValues>(() =>
    customValuesFromLead(lead),
  );
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setValues(customValuesFromLead(lead));
  }, [lead, open]);
  const activeFields = fields.filter((field) => field.active);
  const valid = activeFields.every(
    (field) =>
      !field.required || hasCustomValue(customValueFromValues(values, field)),
  );

  function setField(field: CustomFieldDefinition, value: unknown) {
    const group = customFieldGroup(field.entity);
    setValues((current) => ({
      ...current,
      [group]: { ...current[group], [field.key]: value },
    }));
  }

  async function save() {
    setBusy(true);
    try {
      await onSave(values);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      wide
      title="Custom fields"
      description="Structured details stay with the lead, contact, or organization and can be used in saved filters."
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            tone="primary"
            disabled={busy || !valid}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : "Save fields"}
          </AdminButton>
        </>
      }
    >
      <div className="admin-custom-field-editor">
        {(["lead", "contact", "organization"] as const).map((entity) => {
          const entityFields = activeFields.filter(
            (field) => field.entity === entity,
          );
          if (!entityFields.length) return null;
          return (
            <section key={entity}>
              <div>
                <p className="admin-eyebrow">{entity}</p>
                <h3>
                  {entity === "lead"
                    ? "Lead details"
                    : entity === "contact"
                      ? lead.contact.name
                      : lead.organization.name}
                </h3>
              </div>
              <div className="admin-form-grid">
                {entityFields.map((field) => (
                  <FormField
                    key={field.id}
                    label={`${field.label}${field.required ? " *" : ""}`}
                  >
                    {customFieldInput(
                      field,
                      customValueFromValues(values, field),
                      (value) => setField(field, value),
                    )}
                  </FormField>
                ))}
              </div>
            </section>
          );
        })}
        {!activeFields.length && (
          <p className="admin-muted-copy">
            No active custom fields. Owners can add them in Settings.
          </p>
        )}
      </div>
    </Modal>
  );
}

function customFieldInput(
  field: CustomFieldDefinition,
  value: unknown,
  onChange: (value: unknown) => void,
) {
  if (field.type === "boolean")
    return (
      <label className="admin-toggle-label">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{value === true ? "Yes" : "No"}</span>
      </label>
    );
  if (field.type === "single-select")
    return (
      <select
        value={String(value || "")}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Not set</option>
        {field.options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    );
  if (field.type === "multi-select") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="admin-multi-options">
        {field.options.map((option) => (
          <label key={option}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option]
                    : selected.filter((item) => item !== option),
                )
              }
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }
  return (
    <input
      type={
        field.type === "number"
          ? "number"
          : field.type === "date"
            ? "date"
            : field.type === "url"
              ? "url"
              : "text"
      }
      value={value == null ? "" : String(value)}
      onChange={(event) =>
        onChange(
          field.type === "number" && event.target.value !== ""
            ? Number(event.target.value)
            : event.target.value,
        )
      }
    />
  );
}

function customValuesFromLead(lead: Lead): CustomFieldValues {
  return {
    customFields: { ...lead.customFields },
    contactCustomFields: { ...lead.contact.customFields },
    organizationCustomFields: { ...lead.organization.customFields },
  };
}

function customFieldGroup(
  entity: CustomFieldDefinition["entity"],
): keyof CustomFieldValues {
  return entity === "lead"
    ? "customFields"
    : entity === "contact"
      ? "contactCustomFields"
      : "organizationCustomFields";
}

function customValueFromValues(
  values: CustomFieldValues,
  field: CustomFieldDefinition,
) {
  return values[customFieldGroup(field.entity)][field.key];
}

function customFieldValue(lead: Lead, field: CustomFieldDefinition) {
  return field.entity === "lead"
    ? lead.customFields[field.key]
    : field.entity === "contact"
      ? lead.contact.customFields[field.key]
      : lead.organization.customFields[field.key];
}

function hasCustomValue(value: unknown) {
  return (
    value === true ||
    value === false ||
    typeof value === "number" ||
    (typeof value === "string" && value.trim().length > 0) ||
    (Array.isArray(value) && value.length > 0)
  );
}

function formatCustomValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "—");
}

function EmailComposer({
  open,
  lead,
  initialEmail,
  onClose,
  onComplete,
}: {
  open: boolean;
  lead: Lead;
  initialEmail: EmailMessage | null;
  onClose: () => void;
  onComplete: (action: "draft" | "sent") => Promise<void>;
}) {
  const { session } = useAdmin();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<
    Array<{ id: string; name: string; subject: string; body: string }>
  >([]);
  const [busy, setBusy] = useState<"draft" | "send" | null>(null);
  const [error, setError] = useState("");
  const [configuration, setConfiguration] = useState<{
    enabled: boolean;
    configured: boolean;
    replyToEmail: string;
  } | null>(null);
  useEffect(() => {
    if (!open) return;
    setSubject(
      initialEmail?.subject ||
        `Your Iceland request — ${lead.organization.name}`,
    );
    setBody(
      initialEmail?.body ||
        `Hi ${lead.contact.name},\n\nThank you for reaching out. We are reviewing your Iceland request and will be back in touch shortly.\n\nBest,\n${session.profile?.name || ""}`.trimEnd(),
    );
    setTemplateId("");
    setError("");
    void adminApi
      .emailTemplates()
      .then((result) => {
        setConfiguration(result.configuration);
        setTemplates(result.templates);
      })
      .catch((caught) => setError(messageOf(caught)));
  }, [initialEmail, lead, open, session.profile?.name]);

  function chooseTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    setSubject(
      renderEmailTemplate(template.subject, lead, session.profile?.name || ""),
    );
    setBody(
      renderEmailTemplate(template.body, lead, session.profile?.name || ""),
    );
  }

  async function saveDraft() {
    setBusy("draft");
    setError("");
    try {
      await adminApi.saveEmailDraft(lead.id, subject, body);
      await onComplete("draft");
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    setError("");
    try {
      await adminApi.sendEmail(lead.id, subject, body);
      await onComplete("sent");
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(null);
    }
  }

  const valid = Boolean(subject.trim() && body.trim());
  return (
    <Modal
      open={open}
      wide
      title={initialEmail ? "Continue email draft" : "Send email"}
      description={`To ${lead.contact.name} <${lead.contact.email}>`}
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            disabled={!!busy || !valid}
            onClick={() => void saveDraft()}
          >
            {busy === "draft" ? "Saving…" : "Save draft"}
          </AdminButton>
          <AdminButton
            tone="primary"
            disabled={
              !!busy ||
              !valid ||
              configuration?.enabled === false ||
              configuration?.configured === false
            }
            onClick={() => void send()}
          >
            {busy === "send" ? "Sending…" : "Send and track"}
          </AdminButton>
        </>
      }
    >
      {configuration &&
        (!configuration.enabled || !configuration.configured) && (
          <div className="admin-access-warning">
            Email remains safely disabled until Postmark and the sales reply-to
            mailbox are configured.
          </div>
        )}
      {error && (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-form-stack">
        <FormField
          label="Start from a template"
          hint="Templates personalize contact, organization, package, travel dates, and sender fields."
        >
          <select
            value={templateId}
            onChange={(event) => chooseTemplate(event.target.value)}
          >
            <option value="">Choose a reusable template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Subject">
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </FormField>
        <FormField
          label="Message"
          hint={
            configuration?.replyToEmail
              ? `Replies go to ${configuration.replyToEmail}.`
              : "Replies go to the configured sales mailbox."
          }
        >
          <textarea
            rows={12}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  );
}

function TaskComposer({
  open,
  lead,
  profiles,
  onClose,
  onCreated,
}: {
  open: boolean;
  lead: Lead;
  profiles: AdminProfile[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { session } = useAdmin();
  const [title, setTitle] = useState("Follow up");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState(() =>
    toLocalInput(new Date(Date.now() + 86_400_000).toISOString()),
  );
  const [assigneeId, setAssigneeId] = useState(
    lead.owner?.id || session.profile?.id || "",
  );
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try {
      await adminApi.createTask({
        leadId: lead.id,
        title,
        notes,
        dueAt: new Date(dueAt).toISOString(),
        assigneeId: assigneeId || null,
      });
      await onCreated();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      title="Add a task"
      description={`Create the next clear action for ${lead.contact.name}.`}
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            tone="primary"
            disabled={busy || !title.trim() || !dueAt}
            onClick={() => void create()}
          >
            {busy ? "Creating…" : "Create task"}
          </AdminButton>
        </>
      }
    >
      <div className="admin-form-stack">
        <FormField label="Task">
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </FormField>
        <FormField label="Due">
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
        </FormField>
        <FormField label="Assignee">
          <select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Notes">
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  );
}

export function MyWorkPage() {
  const { notify } = useAdmin();
  const [state, setState] = useState<LoadState>("loading");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [reschedule, setReschedule] = useState<Task | null>(null);
  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await adminApi.tasks({ completed: true });
      setTasks(result.tasks);
      setState("ready");
    } catch (caught) {
      setError(messageOf(caught));
      setState("error");
    }
  }, []);
  useEffect(() => void load(), [load]);
  async function update(
    id: string,
    values: Record<string, unknown>,
    success: string,
  ) {
    try {
      await adminApi.updateTask(id, values);
      notify(success);
      await load();
    } catch (caught) {
      setError(messageOf(caught));
    }
  }
  const groups = useMemo(() => groupTasks(tasks), [tasks]);
  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Activity planner"
        title="My Work"
        description="A focused queue for today, overdue follow-ups, and what’s coming next."
        actions={
          <AdminButton icon="refresh" onClick={() => void load()}>
            Refresh
          </AdminButton>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      {state === "loading" ? (
        <LoadingState label="Loading your work" />
      ) : (
        <>
          <div className="admin-work-summary">
            <Metric
              label="Overdue"
              value={groups.overdue.length}
              tone={groups.overdue.length ? "warning" : "default"}
            />
            <Metric
              label="Due today"
              value={groups.today.length}
              tone="accent"
            />
            <Metric label="Upcoming" value={groups.upcoming.length} />
            <Metric label="Completed" value={groups.completed.length} />
          </div>
          {(["overdue", "today", "upcoming"] as const).map((group) => (
            <TaskGroup
              key={group}
              title={
                group === "overdue"
                  ? "Overdue"
                  : group === "today"
                    ? "Today"
                    : "Upcoming"
              }
              tasks={groups[group]}
              onComplete={(task) =>
                void update(task.id, { status: "completed" }, "Task completed.")
              }
              onReschedule={setReschedule}
            />
          ))}
          <section className="admin-section">
            <button
              className="admin-completed-toggle"
              type="button"
              onClick={() => setShowCompleted((value) => !value)}
            >
              <Icon name="check" size={18} />
              <span>Completed ({groups.completed.length})</span>
              <Icon name="arrow-down" size={15} />
            </button>
            {showCompleted && (
              <TaskGroup
                title="Completed"
                tasks={groups.completed}
                completed
                onComplete={(task) =>
                  void update(task.id, { status: "open" }, "Task reopened.")
                }
                onReschedule={setReschedule}
              />
            )}
          </section>
        </>
      )}
      <RescheduleModal
        task={reschedule}
        onClose={() => setReschedule(null)}
        onSave={async (task, dueAt) => {
          await update(task.id, { dueAt }, "Task rescheduled.");
          setReschedule(null);
        }}
      />
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  onComplete,
  onReschedule,
  completed = false,
}: {
  title: string;
  tasks: Task[];
  onComplete: (task: Task) => void;
  onReschedule: (task: Task) => void;
  completed?: boolean;
}) {
  if (!tasks.length && title !== "Today") return null;
  return (
    <section className="admin-task-group">
      <div className="admin-section-heading">
        <h2>{title}</h2>
        <span>{tasks.length}</span>
      </div>
      {tasks.length ? (
        <div className="admin-task-list">
          {tasks.map((task) => (
            <article key={task.id}>
              <button
                className={`admin-task-check ${completed ? "is-complete" : ""}`}
                type="button"
                onClick={() => onComplete(task)}
                aria-label={
                  completed ? `Reopen ${task.title}` : `Complete ${task.title}`
                }
              >
                <Icon name="check" size={16} />
              </button>
              <Link
                to={task.leadId ? `/admin/leads/${task.leadId}` : "/admin/work"}
              >
                <strong>{task.title}</strong>
                <span>{task.notes || "No notes"}</span>
              </Link>
              <time
                className={
                  isOverdue(task.dueAt) && !completed
                    ? "admin-overdue-text"
                    : ""
                }
              >
                {formatDate(task.dueAt)}
              </time>
              {!completed && (
                <button type="button" onClick={() => onReschedule(task)}>
                  Reschedule
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing due today"
          message="New tasks and next-business-day follow-ups will appear here."
          icon="check"
        />
      )}
    </section>
  );
}

function RescheduleModal({
  task,
  onClose,
  onSave,
}: {
  task: Task | null;
  onClose: () => void;
  onSave: (task: Task, dueAt: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  useEffect(() => setValue(toLocalInput(task?.dueAt)), [task]);
  return (
    <Modal
      open={!!task}
      title="Reschedule task"
      description={task?.title}
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            tone="primary"
            disabled={!value}
            onClick={() =>
              task && void onSave(task, new Date(value).toISOString())
            }
          >
            Save due date
          </AdminButton>
        </>
      }
    >
      <FormField label="New due date">
        <input
          autoFocus
          type="datetime-local"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </FormField>
    </Modal>
  );
}

export function ContentPage() {
  const { notify } = useAdmin();
  const [state, setState] = useState<LoadState>("loading");
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [allEntries, setAllEntries] = useState<ContentEntry[]>([]);
  const [issues, setIssues] = useState<
    Array<{
      entryId: string;
      key: string;
      title: string;
      kind: string;
      message: string;
      route: string | null;
    }>
  >([]);
  const [releases, setReleases] = useState<ContentRelease[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [tab, setTab] = useState<"content" | "health" | "releases">("content");
  const [changedOnly, setChangedOnly] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishNote, setPublishNote] = useState("");
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const [contentResult, allContentResult, healthResult, releaseResult] =
        await Promise.all([
          adminApi.content({
            kind: kind || undefined,
            q: query || undefined,
            changed: changedOnly || undefined,
          }),
          adminApi.content(),
          adminApi.contentHealth(),
          adminApi.contentReleases(),
        ]);
      setEntries(contentResult.entries);
      setAllEntries(allContentResult.entries);
      setIssues(healthResult.issues);
      setReleases(releaseResult.releases);
      setState("ready");
    } catch (caught) {
      setError(messageOf(caught));
      setState("error");
    }
  }, [changedOnly, kind, query]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 160);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function publish() {
    setPublishing(true);
    setError("");
    try {
      await adminApi.publishContent(publishNote || "Website content update");
      setPublishOpen(false);
      setPublishNote("");
      notify("Release created. Production confirmation will appear here.");
      await load();
    } catch (caught) {
      setError(messageOf(caught));
      notify(messageOf(caught), "error");
    } finally {
      setPublishing(false);
    }
  }

  const drafts = allEntries.filter(isDraftEntry);
  return (
    <div className="admin-page admin-page--flush-mobile">
      <PageHeader
        eyebrow="Website CMS"
        title="Content"
        description="Edit, validate, preview, and publish the entire website from one revision history."
        actions={
          <AdminButton
            tone="primary"
            icon="arrow"
            disabled={!drafts.length || issues.length > 0}
            onClick={() => setPublishOpen(true)}
          >
            Publish{" "}
            {drafts.length
              ? `${drafts.length} change${drafts.length === 1 ? "" : "s"}`
              : "changes"}
          </AdminButton>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      <div className="admin-content-statusbar">
        <div>
          <strong>{drafts.length}</strong>
          <span>unpublished</span>
        </div>
        <div className={issues.length ? "has-warning" : ""}>
          <strong>{issues.length}</strong>
          <span>health issue{issues.length === 1 ? "" : "s"}</span>
        </div>
        {releases[0] ? (
          <div>
            <StatusBadge
              label={releases[0].status}
              tone={releaseTone(releases[0].status)}
            />
            <span>release {releases[0].number}</span>
          </div>
        ) : (
          <div>
            <strong>—</strong>
            <span>no release yet</span>
          </div>
        )}
      </div>
      <div className="admin-content-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "content"}
          onClick={() => setTab("content")}
        >
          All content
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "health"}
          onClick={() => setTab("health")}
        >
          Content health <span>{issues.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "releases"}
          onClick={() => setTab("releases")}
        >
          Releases
        </button>
      </div>
      {state === "loading" ? (
        <LoadingState label="Loading content" />
      ) : tab === "content" ? (
        <>
          <div className="admin-filter-bar admin-content-filters">
            <label className="admin-search-field">
              <Icon name="compass" size={17} />
              <span className="u-visually-hidden">Search content</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles and keys…"
              />
            </label>
            <select
              aria-label="Content type"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="">All types</option>
              {contentKinds.map((value) => (
                <option key={value} value={value}>
                  {capitalize(value)}
                </option>
              ))}
            </select>
            <label className="admin-toggle-label">
              <input
                type="checkbox"
                checked={changedOnly}
                onChange={(event) => setChangedOnly(event.target.checked)}
              />
              <span>Unpublished only</span>
            </label>
          </div>
          <div className="admin-content-list">
            {entries.map((entry) => (
              <Link key={entry.id} to={`/admin/content/${entry.id}`}>
                <span
                  className={`admin-content-icon admin-content-icon--${entry.kind}`}
                >
                  <Icon name={contentIcon(entry.kind)} size={18} />
                </span>
                <span className="admin-content-name">
                  <strong>{entry.title}</strong>
                  <small>{entry.key}</small>
                </span>
                <span className="admin-content-route">
                  {entry.route || "Global content"}
                </span>
                {entry.validationErrors.length ? (
                  <StatusBadge
                    label={`${entry.validationErrors.length} issue${entry.validationErrors.length === 1 ? "" : "s"}`}
                    tone="warning"
                  />
                ) : isDraftEntry(entry) ? (
                  <StatusBadge label="Draft changed" tone="accent" />
                ) : (
                  <StatusBadge label="Published" tone="success" />
                )}
                <span>
                  <RelativeTime value={entry.updatedAt} />
                </span>
                <Icon name="arrow" size={17} />
              </Link>
            ))}
            {!entries.length && (
              <EmptyState
                title="No content matches"
                message="Clear the filters to see the complete website schema."
                icon="pen"
              />
            )}
          </div>
        </>
      ) : tab === "health" ? (
        <ContentHealth issues={issues} />
      ) : (
        <ReleaseHistory
          releases={releases}
          onConfirm={async (release) => {
            const result = await adminApi.confirmRelease(release.id);
            notify(
              result.live
                ? "Production is now serving this release."
                : "Production has not switched to this release yet.",
              result.live ? "success" : "info",
            );
            await load();
          }}
        />
      )}
      <Modal
        open={publishOpen}
        title="Publish website changes"
        description="This freezes an immutable release and starts a production deployment. The current site stays live until confirmation succeeds."
        onClose={() => setPublishOpen(false)}
        footer={
          <>
            <AdminButton onClick={() => setPublishOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton
              tone="primary"
              disabled={publishing || issues.length > 0}
              onClick={() => void publish()}
            >
              {publishing ? "Creating release…" : "Publish to production"}
            </AdminButton>
          </>
        }
      >
        <div className="admin-publish-summary">
          <p>
            <strong>{drafts.length}</strong> changed entries will be included in
            the release snapshot.
          </p>
          {issues.length > 0 && (
            <p className="admin-form-error">
              Resolve {issues.length} content health issue
              {issues.length === 1 ? "" : "s"} first.
            </p>
          )}
          <FormField
            label="Release note"
            hint="A short note helps the team understand what changed."
          >
            <textarea
              autoFocus
              rows={4}
              value={publishNote}
              onChange={(event) => setPublishNote(event.target.value)}
              placeholder="Updated winter tour details and contact copy"
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}

function ContentHealth({
  issues,
}: {
  issues: Array<{
    entryId: string;
    key: string;
    title: string;
    kind: string;
    message: string;
    route: string | null;
  }>;
}) {
  if (!issues.length)
    return (
      <EmptyState
        title="Content is ready to publish"
        message="No missing alt text, invalid links, broken references, or incomplete required fields were found."
        icon="shield"
      />
    );
  return (
    <div className="admin-health-list">
      {issues.map((issue, index) => (
        <Link
          key={`${issue.entryId}:${index}`}
          to={`/admin/content/${issue.entryId}`}
        >
          <span>
            <Icon name="shield" size={18} />
          </span>
          <span>
            <strong>{issue.title}</strong>
            <small>
              {capitalize(issue.kind)} · {issue.route || issue.key}
            </small>
          </span>
          <p>{issue.message}</p>
          <Icon name="arrow" size={17} />
        </Link>
      ))}
    </div>
  );
}

function ReleaseHistory({
  releases,
  onConfirm,
}: {
  releases: ContentRelease[];
  onConfirm: (release: ContentRelease) => Promise<void>;
}) {
  if (!releases.length)
    return (
      <EmptyState
        title="No releases yet"
        message="Your first publish will establish the production content marker."
        icon="layers"
      />
    );
  return (
    <div className="admin-release-list">
      {releases.map((release) => (
        <article key={release.id}>
          <div>
            <strong>Release {release.number}</strong>
            <StatusBadge
              label={release.status}
              tone={releaseTone(release.status)}
            />
          </div>
          <p>{release.note || "Website content update"}</p>
          <span>
            Created {formatDate(release.createdAt)}
            {release.liveAt ? ` · Live ${formatDate(release.liveAt)}` : ""}
          </span>
          {release.failureReason && (
            <small className="admin-form-error">{release.failureReason}</small>
          )}
          {["queued", "deploying", "failed"].includes(release.status) && (
            <AdminButton onClick={() => void onConfirm(release)}>
              Check production
            </AdminButton>
          )}
        </article>
      ))}
    </div>
  );
}

export function ContentEditorPage() {
  const { entryId } = useParams();
  const { notify } = useAdmin();
  const [state, setState] = useState<LoadState>("loading");
  const [entry, setEntry] = useState<ContentEntry | null>(null);
  const [revisions, setRevisions] = useState<
    Array<{
      id: string;
      version: number;
      data: Record<string, unknown>;
      validationErrors: string[];
      profileName: string | null;
      note: string;
      createdAt: string;
    }>
  >([]);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<
    "saved" | "unsaved" | "saving" | "conflict" | "error"
  >("saved");
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const currentVersion = useRef(0);
  const draftRef = useRef<Record<string, unknown>>({});
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const saveRef = useRef<() => Promise<void>>(async () => undefined);

  const load = useCallback(async () => {
    if (!entryId) return;
    setState("loading");
    setError("");
    try {
      const result = await adminApi.contentEntry(entryId);
      setEntry(result.detail.entry);
      setRevisions(result.detail.revisions);
      setDraft(result.detail.entry.draft);
      draftRef.current = result.detail.entry.draft;
      currentVersion.current = result.detail.entry.draftVersion;
      dirtyRef.current = false;
      setDirty(false);
      setSaveState("saved");
      setState("ready");
    } catch (caught) {
      setError(messageOf(caught));
      setState("error");
    }
  }, [entryId]);
  useEffect(() => void load(), [load]);

  const save = useCallback(async () => {
    if (!entryId || !dirtyRef.current || savingRef.current) return;
    savingRef.current = true;
    const submitted = draftRef.current;
    const submittedJson = JSON.stringify(submitted);
    setSaveState("saving");
    try {
      const result = await adminApi.saveContent(entryId, {
        version: currentVersion.current,
        data: submitted,
        note: "Autosave",
      });
      const next = result.detail.entry;
      setEntry(next);
      currentVersion.current = next.draftVersion;
      if (JSON.stringify(draftRef.current) === submittedJson) {
        dirtyRef.current = false;
        setDirty(false);
        setSaveState("saved");
      } else {
        setSaveState("unsaved");
      }
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 409)
        setSaveState("conflict");
      else {
        setSaveState("error");
        setError(messageOf(caught));
      }
    } finally {
      savingRef.current = false;
      if (
        dirtyRef.current &&
        JSON.stringify(draftRef.current) !== submittedJson
      ) {
        window.setTimeout(() => void saveRef.current(), 0);
      }
    }
  }, [entryId]);
  saveRef.current = save;
  useEffect(() => {
    if (!dirty) return;
    setSaveState("unsaved");
    const timer = window.setTimeout(() => void save(), 900);
    return () => window.clearTimeout(timer);
  }, [dirty, save]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  if (state === "loading") return <LoadingState label="Opening editor" />;
  if (state === "error" || !entry)
    return (
      <div className="admin-page">
        <ErrorBanner message={error} onRetry={() => void load()} />
      </div>
    );
  return (
    <div className="admin-page admin-editor-page">
      <div className="admin-detail-back">
        <Link to="/admin/content">
          <Icon name="arrow" size={16} />
          Back to content
        </Link>
      </div>
      <header className="admin-editor-header">
        <div>
          <p className="admin-eyebrow">{capitalize(entry.kind)} editor</p>
          <h1>{entry.title}</h1>
          <p>
            {entry.route || "Global website content"} · revision{" "}
            {entry.draftVersion}
          </p>
        </div>
        <div className="admin-editor-actions">
          <SaveIndicator state={saveState} />
          <AdminButton onClick={() => setHistoryOpen(true)} icon="layers">
            History
          </AdminButton>
          {entry.route && (
            <a
              className="admin-button admin-button--secondary"
              href={`${entry.route}?preview=admin&entry=${encodeURIComponent(entry.id)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="expand" size={17} />
              <span>Preview route</span>
            </a>
          )}
          <AdminButton
            tone="primary"
            disabled={!dirty}
            onClick={() => void save()}
          >
            Save now
          </AdminButton>
        </div>
      </header>
      {error && <ErrorBanner message={error} />}
      {saveState === "conflict" && (
        <div className="admin-conflict" role="alert">
          <div>
            <strong>A newer revision exists</strong>
            <p>
              Someone else saved this entry while you were editing. Reload their
              version before continuing so neither edit is silently lost.
            </p>
          </div>
          <AdminButton onClick={() => void load()}>Reload latest</AdminButton>
        </div>
      )}
      {entry.validationErrors.length > 0 && (
        <div className="admin-validation-summary">
          <strong>
            {entry.validationErrors.length} publishing issue
            {entry.validationErrors.length === 1 ? "" : "s"}
          </strong>
          <ul>
            {entry.validationErrors.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="admin-editor-layout">
        <section className="admin-editor-canvas">
          <div className="admin-schema-heading">
            <div>
              <h2>Fields</h2>
              <p>
                Changes autosave as a draft and stay off the live site until
                published.
              </p>
            </div>
            <code>{entry.key}</code>
          </div>
          <StructuredFields
            value={draft}
            onChange={(next) => {
              draftRef.current = next;
              dirtyRef.current = true;
              setDraft(next);
              setDirty(true);
            }}
          />
        </section>
        <aside className="admin-editor-aside">
          <h2>Publishing status</h2>
          <dl>
            <div>
              <dt>Draft</dt>
              <dd>Revision {entry.draftVersion}</dd>
            </div>
            <div>
              <dt>Live</dt>
              <dd>
                {entry.publishedVersion
                  ? `Revision ${entry.publishedVersion}`
                  : "Not published"}
              </dd>
            </div>
            <div>
              <dt>Last changed</dt>
              <dd>{formatDate(entry.updatedAt)}</dd>
            </div>
          </dl>
          {isDraftEntry(entry) ? (
            <StatusBadge label="Unpublished changes" tone="accent" />
          ) : (
            <StatusBadge label="Matches production" tone="success" />
          )}
          <p>
            Publishing is managed from the Content overview so related changes
            ship together.
          </p>
        </aside>
      </div>
      <Modal
        open={historyOpen}
        wide
        title="Revision history"
        description="Every autosave is immutable. Rolling back creates a new revision; history is never rewritten."
        onClose={() => setHistoryOpen(false)}
      >
        <div className="admin-revision-list">
          {revisions.map((revision) => (
            <article key={revision.id}>
              <div>
                <strong>Revision {revision.version}</strong>
                <StatusBadge
                  label={
                    revision.validationErrors.length
                      ? `${revision.validationErrors.length} issues`
                      : "Valid"
                  }
                  tone={
                    revision.validationErrors.length ? "warning" : "success"
                  }
                />
              </div>
              <p>{revision.note || "Saved draft"}</p>
              <span>
                {revision.profileName || "System"} ·{" "}
                {formatDate(revision.createdAt)}
              </span>
              {revision.version !== entry.draftVersion && (
                <AdminButton
                  onClick={async () => {
                    await adminApi.rollbackContent(entry.id, revision.id);
                    setHistoryOpen(false);
                    notify(
                      `Revision ${revision.version} restored as a new draft.`,
                    );
                    await load();
                  }}
                >
                  Restore
                </AdminButton>
              )}
            </article>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function StructuredFields({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  return (
    <div className="admin-schema-fields">
      {Object.entries(value).map(([key, field]) => (
        <StructuredField
          key={key}
          name={key}
          value={field}
          onChange={(next) => onChange({ ...value, [key]: next })}
        />
      ))}
    </div>
  );
}

function StructuredField({
  name,
  value,
  onChange,
  depth = 0,
}: {
  name: string;
  value: unknown;
  onChange: (value: unknown) => void;
  depth?: number;
}) {
  const label = humanize(name);
  if (Array.isArray(value))
    return (
      <details
        className="admin-schema-group admin-schema-details"
        open={depth === 0}
      >
        <summary>
          <span>{label}</span>
          <small>
            {value.length} item{value.length === 1 ? "" : "s"}
          </small>
        </summary>
        <div className="admin-array-fields">
          {value.map((item, index) =>
            isRecord(item) ? (
              <details
                className="admin-array-item admin-array-item--record"
                key={`${name}:${index}`}
              >
                <summary>
                  <span>{structuredItemLabel(label, item, index)}</span>
                  <small>{Object.keys(item).length} fields</small>
                </summary>
                <div className="admin-array-item-fields">
                  {Object.entries(item).map(([key, nested]) => (
                    <StructuredField
                      key={key}
                      name={key}
                      value={nested}
                      depth={depth + 1}
                      onChange={(next) => {
                        const copy = [...value];
                        copy[index] = { ...item, [key]: next };
                        onChange(copy);
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="admin-remove-field"
                  onClick={() =>
                    onChange(
                      value.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  Remove item
                </button>
              </details>
            ) : (
              <div className="admin-array-item" key={`${name}:${index}`}>
                <span className="admin-array-index">{index + 1}</span>
                <StructuredField
                  name={`${label} ${index + 1}`}
                  value={item}
                  depth={depth + 1}
                  onChange={(next) => {
                    const copy = [...value];
                    copy[index] = next;
                    onChange(copy);
                  }}
                />
                <button
                  type="button"
                  className="admin-remove-field"
                  onClick={() =>
                    onChange(
                      value.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ),
          )}
          <AdminButton
            icon="plus"
            onClick={() =>
              onChange([
                ...value,
                value.length && isRecord(value[0])
                  ? Object.fromEntries(
                      Object.keys(value[0]).map((key) => [
                        key,
                        typeof value[0][key] === "boolean" ? false : "",
                      ]),
                    )
                  : "",
              ])
            }
          >
            Add item
          </AdminButton>
        </div>
      </details>
    );
  if (isRecord(value))
    return (
      <details
        className="admin-schema-group admin-schema-details"
        open={depth === 0}
      >
        <summary>
          <span>{label}</span>
          <small>{Object.keys(value).length} fields</small>
        </summary>
        <div className="admin-nested-fields">
          {Object.entries(value).map(([key, nested]) => (
            <StructuredField
              key={key}
              name={key}
              value={nested}
              depth={depth + 1}
              onChange={(next) => onChange({ ...value, [key]: next })}
            />
          ))}
        </div>
      </details>
    );
  if (typeof value === "boolean")
    return (
      <label className="admin-boolean-field">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{label}</span>
      </label>
    );
  if (typeof value === "number")
    return (
      <FormField label={label}>
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </FormField>
    );
  const stringValue = value == null ? "" : String(value);
  const long =
    stringValue.length > 100 ||
    /description|summary|body|intro|content|message|text/i.test(name);
  return (
    <FormField label={label}>
      {long ? (
        <textarea
          rows={Math.min(12, Math.max(4, Math.ceil(stringValue.length / 90)))}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          type={/url|link|image|photo/i.test(name) ? "url" : "text"}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </FormField>
  );
}

function structuredItemLabel(
  groupLabel: string,
  item: Record<string, unknown>,
  index: number,
) {
  const day =
    typeof item.day === "number" || typeof item.day === "string"
      ? `Day ${item.day}`
      : "";
  const name = [item.title, item.name, item.code].find(
    (value) => typeof value === "string" && value.trim(),
  );
  if (day && name) return `${day} · ${String(name)}`;
  if (day) return day;
  if (name) return String(name);
  return `${groupLabel} ${index + 1}`;
}

function SaveIndicator({
  state,
}: {
  state: "saved" | "unsaved" | "saving" | "conflict" | "error";
}) {
  return (
    <span className={`admin-save-indicator admin-save-indicator--${state}`}>
      {state === "saving" && <span className="admin-spinner" />}
      {state === "saved" && <Icon name="check" size={15} />}
      {state === "saved"
        ? "Draft saved"
        : state === "unsaved"
          ? "Unsaved changes"
          : state === "saving"
            ? "Saving…"
            : state === "conflict"
              ? "Save conflict"
              : "Save failed"}
    </span>
  );
}

export function MediaPage() {
  const { notify } = useAdmin();
  const [state, setState] = useState<LoadState>("loading");
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await adminApi.media(query);
      setMedia(result.media);
      setState("ready");
    } catch (caught) {
      setError(messageOf(caught));
      setState("error");
    }
  }, [query]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);
  return (
    <div className="admin-page admin-page--flush-mobile">
      <PageHeader
        eyebrow="Asset library"
        title="Media"
        description="Upload once, add accessible metadata, and understand where every image is used."
        actions={
          <AdminButton
            tone="primary"
            icon="plus"
            onClick={() => setUploadOpen(true)}
          >
            Upload images
          </AdminButton>
        }
      />
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      <div className="admin-filter-bar">
        <label className="admin-search-field">
          <Icon name="compass" size={17} />
          <span className="u-visually-hidden">Search media</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search file names and alt text…"
          />
        </label>
        <span className="admin-filter-count">
          {media.length} asset{media.length === 1 ? "" : "s"}
        </span>
      </div>
      {state === "loading" ? (
        <LoadingState label="Loading media" />
      ) : media.length ? (
        <div className="admin-media-grid">
          {media.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className={asset.status === "trashed" ? "is-trashed" : ""}
              onClick={() => setSelected(asset)}
            >
              <div className="admin-media-thumb">
                <img
                  src={asset.variants["480-webp"] || asset.url}
                  alt={asset.alt || ""}
                  loading="lazy"
                />
                {asset.status !== "ready" && (
                  <StatusBadge
                    label={asset.status}
                    tone={asset.status === "failed" ? "danger" : "warning"}
                  />
                )}
              </div>
              <span>
                <strong>{asset.filename}</strong>
                <small>
                  {asset.width && asset.height
                    ? `${asset.width} × ${asset.height}`
                    : "Processing dimensions"}{" "}
                  · {formatBytes(asset.bytes)}
                </small>
              </span>
              <em>
                {asset.usageCount} use{asset.usageCount === 1 ? "" : "s"}
              </em>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No images yet"
          message="Upload website photography directly to the shared media library."
          icon="layers"
          action={
            <AdminButton tone="primary" onClick={() => setUploadOpen(true)}>
              Upload your first image
            </AdminButton>
          }
        />
      )}
      <MediaUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onComplete={async () => {
          setUploadOpen(false);
          notify("Upload complete. Responsive formats are processing.");
          await load();
          window.setTimeout(() => void load(), 2500);
        }}
      />
      <MediaDetailModal
        asset={selected}
        onClose={() => setSelected(null)}
        onChanged={async () => {
          setSelected(null);
          await load();
        }}
      />
    </div>
  );
}

function MediaUploadModal({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  async function start() {
    setBusy(true);
    setError("");
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;
        await upload(`media/originals/${sanitizeFilename(file.name)}`, file, {
          access: "public",
          handleUploadUrl: "/api/admin/media-upload",
          clientPayload: JSON.stringify({
            alt:
              files.length === 1
                ? alt
                : `${alt} — ${humanize(file.name.replace(/\.[^.]+$/, ""))}`,
            filename: file.name,
          }),
          headers: { "X-Admin-CSRF": adminCsrfToken() },
          onUploadProgress: ({ percentage }) =>
            setProgress(
              Math.round(((index + percentage / 100) / files.length) * 100),
            ),
        });
      }
      setFiles([]);
      setAlt("");
      setProgress(100);
      await onComplete();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      wide
      title="Upload images"
      description="Originals go directly to Blob; the server generates AVIF, WebP, and JPEG variants without routing large files through a Function body."
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            tone="primary"
            disabled={busy || !files.length || !alt.trim()}
            onClick={() => void start()}
          >
            {busy
              ? `Uploading ${progress}%`
              : `Upload ${files.length || ""} image${files.length === 1 ? "" : "s"}`}
          </AdminButton>
        </>
      }
    >
      <label className="admin-upload-drop">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files || []))}
        />
        <Icon name="arrow-down" size={28} />
        <strong>
          {files.length
            ? `${files.length} image${files.length === 1 ? "" : "s"} selected`
            : "Choose images to upload"}
        </strong>
        <span>JPEG, PNG, WebP, or AVIF · up to 10 MB each</span>
      </label>
      {files.length > 0 && (
        <div className="admin-upload-files">
          {files.map((file) => (
            <span key={`${file.name}:${file.size}`}>
              <strong>{file.name}</strong>
              <small>{formatBytes(file.size)}</small>
            </span>
          ))}
        </div>
      )}
      <FormField
        label={files.length > 1 ? "Shared alt-text description" : "Alt text"}
        hint="Required before upload. Describe the image’s meaningful content; individual text can be refined afterward."
      >
        <textarea
          rows={3}
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          placeholder="Guests overlooking a glacier lagoon in southeast Iceland"
        />
      </FormField>
      {busy && (
        <div className="admin-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

function MediaDetailModal({
  asset,
  onClose,
  onChanged,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { notify } = useAdmin();
  const [alt, setAlt] = useState("");
  const [focalX, setFocalX] = useState(0.5);
  const [focalY, setFocalY] = useState(0.5);
  useEffect(() => {
    if (asset) {
      setAlt(asset.alt);
      setFocalX(asset.focalX);
      setFocalY(asset.focalY);
    }
  }, [asset]);
  async function save() {
    if (!asset) return;
    await adminApi.updateMedia(asset.id, {
      alt,
      focalX,
      focalY,
      restore: asset.status === "trashed",
    });
    notify(
      asset.status === "trashed" ? "Image restored." : "Image details saved.",
    );
    await onChanged();
  }
  async function trash() {
    if (!asset || !confirm(`Move ${asset.filename} to 30-day trash?`)) return;
    try {
      await adminApi.trashMedia(asset.id);
      notify("Image moved to trash.");
      await onChanged();
    } catch (caught) {
      notify(messageOf(caught), "error");
    }
  }
  return (
    <Modal
      open={!!asset}
      wide
      title={asset?.filename || "Media details"}
      description={
        asset
          ? `${asset.width || "—"} × ${asset.height || "—"} · ${formatBytes(asset.bytes)} · ${asset.usageCount} references`
          : undefined
      }
      onClose={onClose}
      footer={
        <>
          {asset?.status !== "trashed" && (
            <AdminButton
              tone="danger"
              onClick={() => void trash()}
              disabled={!!asset?.usageCount}
            >
              Move to trash
            </AdminButton>
          )}
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            tone="primary"
            disabled={!alt.trim()}
            onClick={() => void save()}
          >
            {asset?.status === "trashed" ? "Restore image" : "Save details"}
          </AdminButton>
        </>
      }
    >
      {asset && (
        <div className="admin-media-detail">
          <div className="admin-focal-preview">
            <img
              src={asset.variants["768-webp"] || asset.url}
              alt={asset.alt}
              style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }}
            />
            <span
              style={{ left: `${focalX * 100}%`, top: `${focalY * 100}%` }}
            />
          </div>
          <div className="admin-form-stack">
            <FormField label="Alt text">
              <textarea
                rows={4}
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
              />
            </FormField>
            <FormField label="Horizontal focal point">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={focalX}
                onChange={(event) => setFocalX(Number(event.target.value))}
              />
            </FormField>
            <FormField label="Vertical focal point">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={focalY}
                onChange={(event) => setFocalY(Number(event.target.value))}
              />
            </FormField>
            {asset.usageCount > 0 && (
              <p className="admin-access-warning">
                This asset is referenced by {asset.usageCount} content revision
                {asset.usageCount === 1 ? "" : "s"}, so deletion is blocked
                until those references are replaced.
              </p>
            )}
            <a href={asset.url} target="_blank" rel="noreferrer">
              Open original file
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<LeadAnalytics | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await adminApi.analytics(days);
      setData(result.analytics);
      setState("ready");
    } catch (caught) {
      setError(messageOf(caught));
      setState("error");
    }
  }, [days]);
  useEffect(() => void load(), [load]);
  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Sales performance"
        title="Analytics"
        description="Understand pipeline quality, response speed, acquisition sources, markets, packages, and owner workload."
        actions={
          <select
            className="admin-date-range"
            aria-label="Analytics range"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        }
      />
      {state === "loading" ? (
        <LoadingState label="Calculating analytics" />
      ) : state === "error" || !data ? (
        <ErrorBanner message={error} onRetry={() => void load()} />
      ) : (
        <>
          <div className="admin-analytics-metrics">
            <Metric
              label="Lead volume"
              value={data.totals.leads}
              detail={`Last ${days} days`}
            />
            <Metric
              label="Conversion"
              value={`${data.totals.conversionRate}%`}
              detail={`${data.totals.won} won`}
              tone="accent"
            />
            <Metric
              label="Median first response"
              value={
                data.totals.medianFirstResponseMinutes == null
                  ? "—"
                  : formatDuration(data.totals.medianFirstResponseMinutes)
              }
              detail="From inquiry to response"
            />
            <Metric
              label="Within SLA"
              value={
                data.totals.slaPercent == null
                  ? "—"
                  : `${data.totals.slaPercent}%`
              }
              detail={`${data.totals.firstResponseSlaHours}-business-hour target`}
              tone={
                data.totals.slaPercent != null && data.totals.slaPercent < 80
                  ? "warning"
                  : "default"
              }
            />
          </div>
          <section className="admin-panel admin-chart-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="admin-eyebrow">Volume</p>
                <h2>Lead trend</h2>
              </div>
            </div>
            <TrendChart values={data.trend} />
          </section>
          <div className="admin-analytics-grid">
            <BarBreakdown
              title="Pipeline funnel"
              values={data.byStage}
              colored
            />
            <BarBreakdown title="Acquisition sources" values={data.bySource} />
            <BarBreakdown title="Owner workload" values={data.byOwner} />
            <BarBreakdown title="Markets" values={data.byMarket} />
            <BarBreakdown title="Packages" values={data.byPackage} />
            <BarBreakdown title="Travel types" values={data.byTravelType} />
          </div>
          <p className="admin-analytics-note">
            <Icon name="compass" size={16} />
            Website traffic remains in the configured external analytics
            platform; this view measures the operational sales funnel.
          </p>
        </>
      )}
    </div>
  );
}

function TrendChart({
  values,
}: {
  values: Array<{ date: string; value: number }>;
}) {
  const max = Math.max(1, ...values.map((item) => item.value));
  return (
    <div className="admin-trend-chart" aria-label="Lead volume by date">
      {values.map((item) => (
        <div key={item.date} title={`${item.date}: ${item.value} leads`}>
          <span
            style={{ height: `${Math.max(3, (item.value / max) * 100)}%` }}
          />
          <small>
            {new Date(`${item.date}T12:00:00`).toLocaleDateString("en", {
              month: "short",
              day: "numeric",
            })}
          </small>
        </div>
      ))}
    </div>
  );
}

function BarBreakdown({
  title,
  values,
  colored = false,
}: {
  title: string;
  values: Array<{ label: string; value: number; color?: string }>;
  colored?: boolean;
}) {
  const max = Math.max(1, ...values.map((item) => item.value));
  return (
    <section className="admin-panel admin-breakdown">
      <div className="admin-panel-heading">
        <h2>{title}</h2>
        <span>{values.reduce((sum, item) => sum + item.value, 0)} total</span>
      </div>
      <div>
        {values.map((item) => (
          <div className="admin-bar-row" key={item.label}>
            <span>{item.label}</span>
            <div>
              <i
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: colored ? item.color : undefined,
                }}
              />
            </div>
            <strong>{item.value}</strong>
          </div>
        ))}
        {!values.length && (
          <p className="admin-muted-copy">Not enough data yet.</p>
        )}
      </div>
    </section>
  );
}

type LegacySubmissionRecord = Awaited<
  ReturnType<typeof adminApi.legacySubmissions>
>["submissions"][number];

export function LegacyInboxPage() {
  const { session } = useAdmin();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState<LegacySubmissionRecord[]>([]);
  const [storageDriver, setStorageDriver] = useState<string | null>(null);
  const [selected, setSelected] = useState<LegacySubmissionRecord | null>(null);
  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const result = await adminApi.legacySubmissions();
      setSubmissions(result.submissions);
      setStorageDriver(result.storageDriver);
      setState("ready");
    } catch (caught) {
      setError(messageOf(caught));
      setState("error");
    }
  }, []);
  useEffect(() => void load(), [load]);
  if (state === "loading")
    return <LoadingState label="Opening the legacy inbox" />;
  if (state === "error")
    return <ErrorBanner message={error} onRetry={() => void load()} />;
  const v2Enabled = session.adminV2Enabled !== false;
  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Emergency rollback"
        title="Legacy submission inbox"
        description="A read-only view of the original submission store retained during the migration window."
        actions={
          v2Enabled ? (
            <AdminLinkButton to="/admin/leads" tone="primary" icon="group">
              Open CRM
            </AdminLinkButton>
          ) : undefined
        }
      />
      <div className="admin-retention-warning admin-legacy-notice">
        <Icon name="shield" size={20} />
        <p>
          <strong>
            {v2Enabled
              ? "CRM writes are active."
              : "The unified console is paused by feature flag."}
          </strong>{" "}
          Legacy records cannot be edited or deleted here. Imported records
          should be managed in the CRM after cutover.
        </p>
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="admin-eyebrow">
              {storageDriver || "unavailable"} storage
            </p>
            <h2>
              {submissions.length} retained submission
              {submissions.length === 1 ? "" : "s"}
            </h2>
          </div>
          <AdminButton onClick={() => void load()}>Refresh</AdminButton>
        </div>
        {submissions.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table admin-legacy-table">
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Contact</th>
                  <th>Inquiry</th>
                  <th>Form</th>
                  <th>Status</th>
                  <th>
                    <span className="u-visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>{formatDate(submission.createdAt)}</td>
                    <td>
                      <strong>{submission.contact.name}</strong>
                      <span>{submission.contact.email}</span>
                    </td>
                    <td>
                      <strong>{submission.summary}</strong>
                      <span>
                        {submission.contact.country || "Country not provided"}
                      </span>
                    </td>
                    <td>{humanize(submission.formType)}</td>
                    <td>
                      <StatusBadge
                        label={submission.status}
                        tone={
                          submission.status === "new" ? "accent" : "neutral"
                        }
                      />
                    </td>
                    <td>
                      <AdminButton onClick={() => setSelected(submission)}>
                        View
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No legacy submissions"
            message="The retained submission store is empty."
            icon="mail"
          />
        )}
      </section>
      <Modal
        open={!!selected}
        title={selected?.summary || "Legacy submission"}
        description={
          selected
            ? `Received ${formatDate(selected.createdAt)} · ${humanize(selected.formType)}`
            : ""
        }
        onClose={() => setSelected(null)}
        footer={
          <AdminButton onClick={() => setSelected(null)}>Close</AdminButton>
        }
      >
        {selected && (
          <div className="admin-legacy-detail">
            <dl>
              <DetailItem label="Contact" value={selected.contact.name} />
              <DetailItem label="Email" value={selected.contact.email} />
              <DetailItem label="Phone" value={selected.contact.phone} />
              <DetailItem label="Country" value={selected.contact.country} />
              <DetailItem label="Source page" value={selected.sourcePage} />
              <DetailItem label="Original ID" value={selected.id} />
            </dl>
            <div>
              {Object.entries(selected.fields).map(([label, value]) => (
                <section key={label}>
                  <strong>{label}</strong>
                  <p>{value}</p>
                </section>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function RolloutPausedPage() {
  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Rollout paused"
        title="Unified console is currently disabled"
        description="An Owner can review the retained legacy inbox while the feature flag is off. Your named profile and session remain available."
      />
      <EmptyState
        title="Owner access required"
        message="Switch to an Owner profile to open the emergency read-only inbox, or enable ADMIN_V2_ENABLED to use this profile."
        icon="shield"
      />
    </div>
  );
}

export function TeamPage() {
  const { session, notify } = useAdmin();
  const [state, setState] = useState<LoadState>("loading");
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProfile | null>(null);
  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await adminApi.team();
      setProfiles(result.profiles);
      setState("ready");
    } catch (caught) {
      setError(messageOf(caught));
      setState("error");
    }
  }, []);
  useEffect(() => void load(), [load]);
  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Workspace access"
        title="Team"
        description="Manage lightweight named profiles, combined roles, PIN recovery, and activity attribution."
        actions={
          <AdminButton
            tone="primary"
            icon="plus"
            onClick={() => setAddOpen(true)}
          >
            Add profile
          </AdminButton>
        }
      />
      <div className="admin-identity-note">
        <Icon name="shield" size={20} />
        <p>
          <strong>
            Profiles provide attribution, not high-assurance identity.
          </strong>{" "}
          Anyone with the shared workspace password can create a Sales profile.
          Use the shared password as the primary access boundary.
        </p>
      </div>
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      {state === "loading" ? (
        <LoadingState label="Loading team" />
      ) : (
        <div className="admin-team-table admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Access</th>
                <th>Status</th>
                <th>Last active</th>
                <th>
                  <span className="u-visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <span className="admin-owner-cell">
                      <AdminAvatar profile={profile} />
                      <span>
                        <strong>
                          {profile.name}
                          {profile.id === session.profile?.id ? " (you)" : ""}
                        </strong>
                        <small>{profile.email || "No email added"}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <div className="admin-role-badges">
                      {profile.roles.map((role) => (
                        <span key={role}>{capitalize(role)}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <StatusBadge
                      label={profile.active ? "Active" : "Suspended"}
                      tone={profile.active ? "success" : "danger"}
                    />
                  </td>
                  <td>
                    {profile.lastSeenAt ? (
                      <RelativeTime value={profile.lastSeenAt} />
                    ) : (
                      "Never"
                    )}
                  </td>
                  <td>
                    <AdminButton
                      tone="quiet"
                      onClick={() => setEditing(profile)}
                    >
                      Manage
                    </AdminButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CreateProfileModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={async () => {
          setAddOpen(false);
          notify("Profile created with Sales access.");
          await load();
        }}
      />
      <ManageProfileModal
        profile={editing}
        currentProfileId={session.profile?.id || ""}
        onClose={() => setEditing(null)}
        onChanged={async () => {
          setEditing(null);
          await load();
        }}
      />
    </div>
  );
}

function CreateProfileModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create() {
    setBusy(true);
    setError("");
    try {
      await adminApi.createProfile(name, pin);
      setName("");
      setPin("");
      await onCreated();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      title="Add a profile"
      description="New profiles begin with Sales access. You can grant Editor or Owner after creation."
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            tone="primary"
            disabled={busy || name.trim().length < 2 || pin.length !== 4}
            onClick={() => void create()}
          >
            Create profile
          </AdminButton>
        </>
      }
    >
      <div className="admin-form-stack">
        <FormField label="Name">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormField label="Temporary four-digit PIN">
          <input
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            value={pin}
            onChange={(event) =>
              setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
            }
          />
        </FormField>
        {error && <p className="admin-form-error">{error}</p>}
      </div>
    </Modal>
  );
}

function ManageProfileModal({
  profile,
  currentProfileId,
  onClose,
  onChanged,
}: {
  profile: AdminProfile | null;
  currentProfileId: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { notify } = useAdmin();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<ProfileRole[]>([]);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email || "");
      setRoles(profile.roles);
      setPin("");
      setError("");
    }
  }, [profile]);
  async function save(extra: Record<string, unknown> = {}) {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      await adminApi.updateProfile(profile.id, {
        name,
        email: email || null,
        roles,
        ...extra,
        ...(pin ? { pin } : {}),
      });
      notify(pin ? "Profile and PIN updated." : "Profile updated.");
      await onChanged();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={!!profile}
      title={`Manage ${profile?.name || "profile"}`}
      description="Role changes and PIN resets are recorded in the audit log."
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            tone="primary"
            disabled={
              busy ||
              !name.trim() ||
              !roles.length ||
              (pin.length > 0 && pin.length !== 4)
            }
            onClick={() => void save()}
          >
            Save changes
          </AdminButton>
        </>
      }
    >
      <div className="admin-form-stack">
        <FormField label="Name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormField>
        <FormField
          label="Email"
          hint="Optional; required only for email escalations and digests."
        >
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <fieldset className="admin-fieldset">
          <legend>Access roles</legend>
          <div className="admin-checkbox-list">
            {(["sales", "editor", "owner"] as ProfileRole[]).map((role) => (
              <label key={role}>
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={(event) =>
                    setRoles(
                      event.target.checked
                        ? [...roles, role]
                        : roles.filter((item) => item !== role),
                    )
                  }
                />
                <span>
                  <strong>{capitalize(role)}</strong>
                  <small>
                    {role === "sales"
                      ? "Leads, tasks, email, and analytics"
                      : role === "editor"
                        ? "Content, media, previews, and publishing"
                        : "Team, settings, pipeline, and all access"}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <FormField
          label="Reset PIN"
          hint="Leave blank to keep the current PIN."
        >
          <input
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="New four-digit PIN"
            value={pin}
            onChange={(event) =>
              setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
            }
          />
        </FormField>
        {error && <p className="admin-form-error">{error}</p>}
        {profile && profile.id !== currentProfileId && (
          <div className="admin-suspend-row">
            <div>
              <strong>
                {profile.active ? "Suspend profile" : "Restore profile"}
              </strong>
              <p>
                {profile.active
                  ? "Immediately invalidates this person’s sessions while preserving their attribution."
                  : "Allows this profile to unlock the workspace again."}
              </p>
            </div>
            <AdminButton
              tone={profile.active ? "danger" : "secondary"}
              onClick={() => void save({ active: !profile.active })}
            >
              {profile.active ? "Suspend" : "Restore"}
            </AdminButton>
          </div>
        )}
      </div>
    </Modal>
  );
}

interface WorkspaceSetting {
  timezone: string;
  firstResponseSlaHours: number;
  followUpBusinessDays?: number;
  followUpTime?: string;
  businessHours?: { start?: string; end?: string; weekdays?: number[] };
}
interface RetentionSetting {
  automaticDeletion: boolean;
  trashDays: number;
}
interface AssignmentRule {
  field: "country" | "packageCode" | "formType";
  value: string;
  profileId: string;
}

export function SettingsPage() {
  const { notify } = useAdmin();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceSetting>({
    timezone: "Atlantic/Reykjavik",
    firstResponseSlaHours: 4,
  });
  const [retention, setRetention] = useState<RetentionSetting>({
    automaticDeletion: false,
    trashDays: 30,
  });
  const [preferences, setPreferences] = useState({
    browser: false,
    emailImmediate: false,
    emailDigest: false,
  });
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [fields, setFields] = useState<Array<Record<string, unknown>>>([]);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [assignmentRules, setAssignmentRules] = useState<AssignmentRule[]>([]);
  const [fieldOpen, setFieldOpen] = useState(false);
  const load = useCallback(async () => {
    setState("loading");
    try {
      const [settingsResult, stageResult, fieldResult, profileResult] =
        await Promise.all([
          adminApi.settings(),
          adminApi.stages(),
          adminApi.customFields(),
          adminApi.profiles(),
        ]);
      const values = settingsResult.settings.values;
      setWorkspace((values.workspace as WorkspaceSetting) || workspace);
      setRetention((values.retention as RetentionSetting) || retention);
      setAssignmentRules(
        Array.isArray(values.assignment_rules)
          ? (values.assignment_rules as AssignmentRule[])
          : [],
      );
      setPreferences(settingsResult.settings.notificationPreferences);
      setStages(stageResult.stages);
      setFields(fieldResult.fields);
      setProfiles(
        profileResult.profiles.filter(
          (profile) =>
            profile.active && hasRole(profile.roles, "sales", "owner"),
        ),
      );
      setState("ready");
    } catch (caught) {
      setError(messageOf(caught));
      setState("error");
    }
  }, []);
  useEffect(() => void load(), [load]);
  async function saveSetting(
    key: "workspace" | "retention" | "assignment_rules",
    value: unknown,
  ) {
    try {
      await adminApi.updateSetting(key, value);
      notify("Settings saved.");
    } catch (caught) {
      setError(messageOf(caught));
    }
  }
  async function savePreferences(next: typeof preferences) {
    setPreferences(next);
    try {
      await adminApi.updatePreferences(next);
      notify("Notification preferences saved.");
    } catch (caught) {
      setError(messageOf(caught));
    }
  }
  async function savePipeline(next: LeadStage[]) {
    setStages(next.map((stage, position) => ({ ...stage, position })));
    try {
      await adminApi.updateStages(
        next.map((stage, position) => ({ ...stage, position })),
      );
      notify("Pipeline updated.");
    } catch (caught) {
      setError(messageOf(caught));
      await load();
    }
  }
  if (state === "loading") return <LoadingState label="Loading settings" />;
  return (
    <div className="admin-page">
      <PageHeader
        eyebrow="Owner controls"
        title="Settings"
        description="Set the rules and defaults that keep sales and publishing predictable."
      />
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      <div className="admin-settings-layout">
        <nav aria-label="Settings sections">
          <a href="#workspace">Workspace</a>
          <a href="#assignment">Assignment</a>
          <a href="#pipeline">Pipeline</a>
          <a href="#fields">Custom fields</a>
          <a href="#notifications">Notifications</a>
          <a href="#retention">Data retention</a>
        </nav>
        <div className="admin-settings-sections">
          <section id="workspace" className="admin-panel">
            <div className="admin-settings-heading">
              <div>
                <h2>Workspace</h2>
                <p>
                  Defaults used for due dates, SLA calculations, and analytics.
                </p>
              </div>
              <AdminButton
                tone="primary"
                onClick={() => void saveSetting("workspace", workspace)}
              >
                Save
              </AdminButton>
            </div>
            <div className="admin-form-grid">
              <FormField label="Timezone">
                <input
                  value={workspace.timezone}
                  onChange={(event) =>
                    setWorkspace({ ...workspace, timezone: event.target.value })
                  }
                />
              </FormField>
              <FormField
                label="First-response SLA"
                hint="Counted only during business hours"
              >
                <div className="admin-input-suffix">
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={workspace.firstResponseSlaHours}
                    onChange={(event) =>
                      setWorkspace({
                        ...workspace,
                        firstResponseSlaHours: Number(event.target.value),
                      })
                    }
                  />
                  <span>hours</span>
                </div>
              </FormField>
              <FormField label="Business day starts">
                <input
                  type="time"
                  value={workspace.businessHours?.start || "09:00"}
                  onChange={(event) =>
                    setWorkspace({
                      ...workspace,
                      businessHours: {
                        ...workspace.businessHours,
                        start: event.target.value,
                      },
                    })
                  }
                />
              </FormField>
              <FormField label="Business day ends">
                <input
                  type="time"
                  value={workspace.businessHours?.end || "17:00"}
                  onChange={(event) =>
                    setWorkspace({
                      ...workspace,
                      businessHours: {
                        ...workspace.businessHours,
                        end: event.target.value,
                      },
                    })
                  }
                />
              </FormField>
              <FormField
                label="Automatic follow-up"
                hint="Business days after intake"
              >
                <div className="admin-input-suffix">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={workspace.followUpBusinessDays || 1}
                    onChange={(event) =>
                      setWorkspace({
                        ...workspace,
                        followUpBusinessDays: Number(event.target.value),
                      })
                    }
                  />
                  <span>days</span>
                </div>
              </FormField>
              <FormField label="Follow-up due time">
                <input
                  type="time"
                  value={
                    workspace.followUpTime ||
                    workspace.businessHours?.start ||
                    "09:00"
                  }
                  onChange={(event) =>
                    setWorkspace({
                      ...workspace,
                      followUpTime: event.target.value,
                    })
                  }
                />
              </FormField>
            </div>
            <fieldset className="admin-fieldset admin-weekdays">
              <legend>Business weekdays</legend>
              <div>
                {weekdayLabels.map((label, day) => (
                  <label key={label}>
                    <input
                      type="checkbox"
                      checked={(
                        workspace.businessHours?.weekdays || [1, 2, 3, 4, 5]
                      ).includes(day)}
                      onChange={(event) => {
                        const current = workspace.businessHours?.weekdays || [
                          1, 2, 3, 4, 5,
                        ];
                        const weekdays = event.target.checked
                          ? [...new Set([...current, day])].sort()
                          : current.filter((value) => value !== day);
                        setWorkspace({
                          ...workspace,
                          businessHours: {
                            ...workspace.businessHours,
                            weekdays,
                          },
                        });
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
          <section id="assignment" className="admin-panel">
            <div className="admin-settings-heading">
              <div>
                <h2>Lead assignment</h2>
                <p>
                  Rules run top to bottom. The first exact match assigns the
                  lead and its follow-up task.
                </p>
              </div>
              <AdminButton
                tone="primary"
                onClick={() =>
                  void saveSetting(
                    "assignment_rules",
                    assignmentRules.filter(
                      (rule) => rule.value.trim() && rule.profileId,
                    ),
                  )
                }
              >
                Save rules
              </AdminButton>
            </div>
            <div className="admin-assignment-rules">
              {assignmentRules.map((rule, index) => (
                <div key={index}>
                  <select
                    aria-label={`Rule ${index + 1} field`}
                    value={rule.field}
                    onChange={(event) =>
                      setAssignmentRules(
                        replaceAt(assignmentRules, index, {
                          ...rule,
                          field: event.target.value as AssignmentRule["field"],
                          value: "",
                        }),
                      )
                    }
                  >
                    <option value="country">Country</option>
                    <option value="packageCode">Package</option>
                    <option value="formType">Form type</option>
                  </select>
                  {rule.field === "formType" ? (
                    <select
                      aria-label={`Rule ${index + 1} value`}
                      value={rule.value}
                      onChange={(event) =>
                        setAssignmentRules(
                          replaceAt(assignmentRules, index, {
                            ...rule,
                            value: event.target.value,
                          }),
                        )
                      }
                    >
                      <option value="">Choose a form</option>
                      <option value="inquiry">Inquiry</option>
                      <option value="rate-sheet">Rate sheet</option>
                    </select>
                  ) : (
                    <input
                      aria-label={`Rule ${index + 1} value`}
                      value={rule.value}
                      placeholder={
                        rule.field === "country"
                          ? "e.g. Canada"
                          : "e.g. STD02R8"
                      }
                      onChange={(event) =>
                        setAssignmentRules(
                          replaceAt(assignmentRules, index, {
                            ...rule,
                            value: event.target.value,
                          }),
                        )
                      }
                    />
                  )}
                  <select
                    aria-label={`Rule ${index + 1} assignee`}
                    value={rule.profileId}
                    onChange={(event) =>
                      setAssignmentRules(
                        replaceAt(assignmentRules, index, {
                          ...rule,
                          profileId: event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">Choose an owner</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`Remove assignment rule ${index + 1}`}
                    onClick={() =>
                      setAssignmentRules(
                        assignmentRules.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              {!assignmentRules.length && (
                <p className="admin-muted-copy">
                  No rules yet. New leads remain unassigned until someone claims
                  them.
                </p>
              )}
            </div>
            <AdminButton
              icon="plus"
              onClick={() =>
                setAssignmentRules([
                  ...assignmentRules,
                  { field: "country", value: "", profileId: "" },
                ])
              }
            >
              Add assignment rule
            </AdminButton>
          </section>
          <section id="pipeline" className="admin-panel">
            <div className="admin-settings-heading">
              <div>
                <h2>Pipeline stages</h2>
                <p>
                  Labels and order can change; stable categories preserve
                  reporting.
                </p>
              </div>
              <AdminButton
                tone="primary"
                onClick={() => void savePipeline(stages)}
              >
                Save order
              </AdminButton>
            </div>
            <div className="admin-pipeline-settings">
              {stages.map((stage, index) => (
                <div key={stage.id}>
                  <span className="admin-drag-handle">{index + 1}</span>
                  <input
                    aria-label={`Color for ${stage.name}`}
                    type="color"
                    value={stage.color}
                    onChange={(event) =>
                      setStages(
                        replaceAt(stages, index, {
                          ...stage,
                          color: event.target.value,
                        }),
                      )
                    }
                  />
                  <input
                    aria-label="Stage name"
                    value={stage.name}
                    onChange={(event) =>
                      setStages(
                        replaceAt(stages, index, {
                          ...stage,
                          name: event.target.value,
                        }),
                      )
                    }
                  />
                  <select
                    aria-label="Analytics category"
                    value={stage.category}
                    onChange={(event) =>
                      setStages(
                        replaceAt(stages, index, {
                          ...stage,
                          category: event.target.value as LeadStage["category"],
                        }),
                      )
                    }
                  >
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                    <option value="archived">Archived</option>
                  </select>
                  <label>
                    <input
                      type="checkbox"
                      checked={stage.active}
                      onChange={(event) =>
                        setStages(
                          replaceAt(stages, index, {
                            ...stage,
                            active: event.target.checked,
                          }),
                        )
                      }
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    aria-label={`Move ${stage.name} up`}
                    disabled={index === 0}
                    onClick={() =>
                      setStages(moveItem(stages, index, index - 1))
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${stage.name} down`}
                    disabled={index === stages.length - 1}
                    onClick={() =>
                      setStages(moveItem(stages, index, index + 1))
                    }
                  >
                    ↓
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section id="fields" className="admin-panel">
            <div className="admin-settings-heading">
              <div>
                <h2>Custom fields</h2>
                <p>
                  Add structured data to leads, contacts, and organizations.
                </p>
              </div>
              <AdminButton icon="plus" onClick={() => setFieldOpen(true)}>
                Add field
              </AdminButton>
            </div>
            {fields.length ? (
              <div className="admin-custom-fields">
                {fields.map((field) => (
                  <div key={String(field.id)}>
                    <span>
                      <strong>{String(field.label)}</strong>
                      <small>
                        {capitalize(String(field.entity))} ·{" "}
                        {String(field.type)}
                      </small>
                    </span>
                    <code>{String(field.key)}</code>
                    <StatusBadge
                      label={field.active ? "Active" : "Inactive"}
                      tone={field.active ? "success" : "neutral"}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-muted-copy">
                No custom fields have been created.
              </p>
            )}
          </section>
          <section id="notifications" className="admin-panel">
            <div className="admin-settings-heading">
              <div>
                <h2>Your notifications</h2>
                <p>
                  In-app alerts are always available. These optional channels
                  apply only to your profile.
                </p>
              </div>
            </div>
            <div className="admin-switch-list">
              <SwitchRow
                label="Browser alerts"
                description="Use system notifications for important activity while signed in."
                checked={preferences.browser}
                onChange={(browser) =>
                  void savePreferences({ ...preferences, browser })
                }
              />
              <SwitchRow
                label="Immediate email escalation"
                description="Email urgent failures and SLA issues to your profile email."
                checked={preferences.emailImmediate}
                onChange={(emailImmediate) =>
                  void savePreferences({ ...preferences, emailImmediate })
                }
              />
              <SwitchRow
                label="Daily digest"
                description="Receive one concise summary of assigned work each day."
                checked={preferences.emailDigest}
                onChange={(emailDigest) =>
                  void savePreferences({ ...preferences, emailDigest })
                }
              />
            </div>
          </section>
          <section id="retention" className="admin-panel">
            <div className="admin-settings-heading">
              <div>
                <h2>Data retention</h2>
                <p>
                  Soft deletion protects against mistakes. Automatic lead
                  deletion is intentionally off by default.
                </p>
              </div>
              <AdminButton
                tone="primary"
                onClick={() => void saveSetting("retention", retention)}
              >
                Save
              </AdminButton>
            </div>
            <div className="admin-retention-warning">
              <Icon name="shield" size={20} />
              <p>
                Trashed leads and unreferenced media are retained for{" "}
                <strong>{retention.trashDays} days</strong>. Legacy submission
                blobs remain read-only during the migration window.
              </p>
            </div>
            <div className="admin-settings-inline-action">
              <AdminLinkButton to="/admin/legacy" icon="mail">
                Open legacy inbox
              </AdminLinkButton>
              <span>
                Owner-only emergency access to retained pre-migration records.
              </span>
            </div>
            <SwitchRow
              label="Automatic lead deletion"
              description="Permanently remove leads after the configured retention policy. Leave off unless legal policy requires it."
              checked={retention.automaticDeletion}
              onChange={(automaticDeletion) =>
                setRetention({ ...retention, automaticDeletion })
              }
            />
          </section>
        </div>
      </div>
      <CustomFieldModal
        open={fieldOpen}
        onClose={() => setFieldOpen(false)}
        onCreated={async () => {
          setFieldOpen(false);
          notify("Custom field created.");
          await load();
        }}
      />
    </div>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="admin-switch-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}

function CustomFieldModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [entity, setEntity] = useState("lead");
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (label && !key)
      setKey(
        label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, ""),
      );
  }, [key, label]);
  async function create() {
    try {
      await adminApi.saveCustomField({
        entity,
        label,
        key,
        type,
        options: options
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        required,
        position: 0,
        active: true,
      });
      setLabel("");
      setKey("");
      await onCreated();
    } catch (caught) {
      setError(messageOf(caught));
    }
  }
  const selects = type === "single-select" || type === "multi-select";
  return (
    <Modal
      open={open}
      title="Add a custom field"
      description="Custom fields become filterable structured data, not free-floating notes."
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton
            tone="primary"
            disabled={!label.trim() || key.length < 2}
            onClick={() => void create()}
          >
            Create field
          </AdminButton>
        </>
      }
    >
      <div className="admin-form-stack">
        <div className="admin-form-grid">
          <FormField label="Applies to">
            <select
              value={entity}
              onChange={(event) => setEntity(event.target.value)}
            >
              <option value="lead">Lead</option>
              <option value="contact">Contact</option>
              <option value="organization">Organization</option>
            </select>
          </FormField>
          <FormField label="Field type">
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {[
                "text",
                "number",
                "date",
                "boolean",
                "url",
                "single-select",
                "multi-select",
              ].map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField label="Label">
          <input
            autoFocus
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </FormField>
        <FormField
          label="API key"
          hint="Lowercase letters, numbers, and underscores. This remains stable when the label changes."
        >
          <input
            value={key}
            onChange={(event) =>
              setKey(
                event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
              )
            }
          />
        </FormField>
        {selects && (
          <FormField label="Options" hint="Comma-separated">
            <textarea
              rows={3}
              value={options}
              onChange={(event) => setOptions(event.target.value)}
            />
          </FormField>
        )}
        <label className="admin-toggle-label">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          <span>Required field</span>
        </label>
        {error && <p className="admin-form-error">{error}</p>}
      </div>
    </Modal>
  );
}

function Timeline({
  events,
  emails = [],
  retryingEmailId,
  onOpenDraft,
  onRetryEmail,
}: {
  events: LeadEvent[];
  emails?: EmailMessage[];
  retryingEmailId?: string | null;
  onOpenDraft?: (email: EmailMessage) => void;
  onRetryEmail?: (email: EmailMessage) => void;
}) {
  const messageIds = new Set(emails.map((email) => email.id));
  const visibleEvents = events.filter(
    (event) =>
      event.type !== "email.sent" ||
      !messageIds.has(String(event.metadata.emailMessageId || "")),
  );
  const combined = [
    ...visibleEvents.map((event) => ({
      id: event.id,
      date: event.createdAt,
      kind: "event" as const,
      event,
    })),
    ...emails.map((email) => ({
      id: email.id,
      date: email.createdAt,
      kind: "email" as const,
      email,
    })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  if (!combined.length)
    return <p className="admin-muted-copy">No activity yet.</p>;
  return (
    <ol className="admin-timeline">
      {combined.map((item) =>
        item.kind === "event" ? (
          <li key={item.id}>
            <span>
              <Icon name={eventIcon(item.event.type)} size={15} />
            </span>
            <div>
              <p>{item.event.body}</p>
              <small>
                {item.event.profileName || "System"} ·{" "}
                <RelativeTime value={item.event.createdAt} />
              </small>
            </div>
          </li>
        ) : (
          <li key={item.id}>
            <span>
              <Icon name="mail" size={15} />
            </span>
            <div>
              <p>
                <strong>
                  {item.email.status === "draft" ? "Draft" : "Email"}:{" "}
                  {item.email.subject}
                </strong>
              </p>
              <small>
                Outbound · {item.email.status} ·{" "}
                <RelativeTime value={item.email.createdAt} />
              </small>
              {item.email.failureReason && <em>{item.email.failureReason}</em>}
              {((item.email.status === "draft" && onOpenDraft) ||
                ((item.email.status === "failed" ||
                  item.email.status === "bounced") &&
                  onRetryEmail)) && (
                <div className="admin-timeline-actions">
                  {item.email.status === "draft" && onOpenDraft && (
                    <button
                      type="button"
                      onClick={() => onOpenDraft(item.email)}
                    >
                      Continue draft
                    </button>
                  )}
                  {(item.email.status === "failed" ||
                    item.email.status === "bounced") &&
                    onRetryEmail && (
                      <button
                        type="button"
                        disabled={retryingEmailId === item.email.id}
                        onClick={() => onRetryEmail(item.email)}
                      >
                        {retryingEmailId === item.email.id
                          ? "Retrying…"
                          : "Retry send"}
                      </button>
                    )}
                </div>
              )}
            </div>
          </li>
        ),
      )}
    </ol>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "Not provided"}</dd>
    </div>
  );
}

function groupTasks(tasks: Task[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    overdue: tasks.filter(
      (task) => task.status === "open" && new Date(task.dueAt) < start,
    ),
    today: tasks.filter(
      (task) =>
        task.status === "open" &&
        new Date(task.dueAt) >= start &&
        new Date(task.dueAt) < end,
    ),
    upcoming: tasks.filter(
      (task) => task.status === "open" && new Date(task.dueAt) >= end,
    ),
    completed: tasks.filter((task) => task.status === "completed"),
  };
}

function isDraftEntry(entry: ContentEntry) {
  return entry.draftVersion !== entry.publishedVersion;
}
const contentKinds: ContentKind[] = [
  "copy",
  "tour",
  "region",
  "destination",
  "service",
  "faq",
  "testimonial",
  "office",
  "legal",
  "site",
];
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function contentIcon(kind: ContentKind) {
  return kind === "tour"
    ? "route"
    : kind === "region" || kind === "destination"
      ? "map-pin"
      : kind === "copy" || kind === "legal"
        ? "pen"
        : kind === "testimonial"
          ? "star"
          : kind === "office"
            ? "group"
            : "layers";
}
function eventIcon(type: string) {
  return type.includes("call")
    ? "phone"
    : type.includes("task")
      ? "check"
      : type.includes("stage")
        ? "route"
        : type.includes("owner")
          ? "group"
          : type.includes("email")
            ? "mail"
            : "pen";
}
function releaseTone(
  status: ContentRelease["status"],
): "success" | "warning" | "danger" | "neutral" | "accent" {
  return status === "live"
    ? "success"
    : status === "failed"
      ? "danger"
      : status === "deploying" || status === "queued"
        ? "warning"
        : "neutral";
}
function hasRole(roles: ProfileRole[] | undefined, ...required: ProfileRole[]) {
  return !!roles?.some((role) => required.includes(role));
}
function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function firstName(name: string) {
  return name.trim().split(/\s+/)[0];
}
function dayPart() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}
function isOverdue(value: string) {
  return new Date(value).getTime() < Date.now();
}
function renderEmailTemplate(value: string, lead: Lead, sender: string) {
  const variables: Record<string, string> = {
    agency: lead.organization.name,
    organization: lead.organization.name,
    contact: lead.contact.name,
    contactName: lead.contact.name,
    package: lead.packageCode || "your Iceland itinerary",
    packageCode: lead.packageCode || "",
    travelDates: lead.travelDates || "",
    sender,
  };
  return value.replace(
    /\{\{\s*([a-zA-Z]+)\s*\}\}/g,
    (placeholder, key: string) =>
      key in variables ? variables[key] : placeholder,
  );
}
function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function shortUrl(value: string) {
  try {
    const url = new URL(value, location.origin);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return value;
  }
}
function sanitizeFilename(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}
function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
function formatDuration(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
}
function columnLabel(column: LeadColumn) {
  return (
    {
      contact: "Contact",
      organization: "Organization",
      stage: "Stage",
      owner: "Owner",
      priority: "Priority",
      nextAction: "Next action",
      created: "Received",
    } as const
  )[column];
}
function replaceAt<T>(items: T[], index: number, value: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}
function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}
function attentionDetail(label: string) {
  if (label === "New leads") return "Awaiting review and qualification";
  if (label === "Unassigned") return "Need a clear owner";
  if (label === "SLA breaches")
    return "First response is outside business hours";
  if (label === "Overdue follow-ups") return "Past their planned next action";
  if (label === "Unread mentions") return "A teammate needs your attention";
  if (label === "Failed emails") return "Need retry or direct follow-up";
  return "Ready for review and publishing";
}
