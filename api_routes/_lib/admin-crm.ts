import crypto from "node:crypto";

import {
  DEFAULT_PIPELINE_STAGES,
  type AdminDashboard,
  type AdminNotification,
  type AdminProfile,
  type CursorPage,
  type EmailMessage,
  type InquiryInput,
  type Lead,
  type LeadAnalytics,
  type LeadEvent,
  type LeadPriority,
  type Task,
} from "../../shared/admin-contracts.js";
import { formTypeFromSourcePage } from "../../shared/form-type.js";
import { audit } from "./admin-auth.js";
import {
  businessMinutesBetween,
  nextBusinessDay as scheduledNextBusinessDay,
  workspaceSchedule,
  type WorkspaceSchedule,
} from "./business-time.js";
import { withDatabase, type DatabaseSession } from "./database.js";
import { HttpError } from "./http.js";

interface LeadRow extends Record<string, unknown> {
  id: string;
  legacy_id: string | null;
  title: string;
  summary: string;
  message: string;
  source: string;
  source_page: string;
  form_type: string;
  package_code: string | null;
  travel_dates: string | null;
  pax: string | null;
  travel_type: string | null;
  priority: LeadPriority;
  duplicate: boolean;
  custom_fields: Record<string, unknown> | null;
  first_responded_at: Date | string | null;
  next_action_at: Date | string | null;
  version: number;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
  organization_id: string;
  organization_name: string;
  organization_country: string | null;
  organization_website: string | null;
  organization_custom_fields: Record<string, unknown> | null;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  contact_country: string | null;
  contact_custom_fields: Record<string, unknown> | null;
  stage_id: string;
  stage_name: string;
  stage_category: "open" | "won" | "lost" | "archived";
  stage_color: string;
  stage_position: number;
  stage_active: boolean;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_color: string | null;
  owner_active: boolean | null;
  owner_created_at: Date | string | null;
  owner_last_seen_at: Date | string | null;
  owner_roles: AdminProfile["roles"] | null;
  tag_names: string[] | null;
}

interface TaskRow extends Record<string, unknown> {
  id: string;
  lead_id: string | null;
  assignee_id: string | null;
  title: string;
  notes: string;
  due_at: Date | string;
  status: Task["status"];
  completed_at: Date | string | null;
  created_at: Date | string;
}

interface EventRow extends Record<string, unknown> {
  id: string;
  lead_id: string;
  profile_id: string | null;
  profile_name: string | null;
  type: string;
  body: string;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
}

interface NotificationRow extends Record<string, unknown> {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read_at: Date | string | null;
  dismissed_at: Date | string | null;
  created_at: Date | string;
}

export interface LeadListFilters {
  query?: string;
  stageId?: string;
  ownerId?: string;
  priority?: string;
  source?: string;
  formType?: string;
  country?: string;
  packageCode?: string;
  travelDates?: string;
  customFieldKey?: string;
  customFieldValue?: string;
  due?: "overdue" | "today" | "upcoming";
  includeDeleted?: boolean;
  cursor?: string;
  limit?: number;
}

export interface LeadDetail {
  lead: Lead;
  events: LeadEvent[];
  tasks: Task[];
  emails: EmailMessage[];
}

export async function ensureAdminSeeded() {
  await withDatabase(
    async (database) => {
      const count = await database.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM pipeline_stages`,
      );
      if (Number(count[0]?.count || 0) === 0) {
        for (const stage of DEFAULT_PIPELINE_STAGES) {
          await database.query(
            `INSERT INTO pipeline_stages (name, category, color, position)
           VALUES ($1, $2, $3, $4)`,
            [stage.name, stage.category, stage.color, stage.position],
          );
        }
      }
      await database.query(
        `INSERT INTO app_settings (key, value)
       VALUES
        ('workspace', $1::jsonb),
        ('assignment_rules', '[]'::jsonb),
        ('retention', $2::jsonb)
       ON CONFLICT (key) DO NOTHING`,
        [
          JSON.stringify({
            timezone: "Atlantic/Reykjavik",
            firstResponseSlaHours: 4,
            followUpBusinessDays: 1,
            followUpTime: "09:00",
            businessHours: {
              start: "09:00",
              end: "17:00",
              weekdays: [1, 2, 3, 4, 5],
            },
          }),
          JSON.stringify({ automaticDeletion: false, trashDays: 30 }),
        ],
      );
      await database.query(
        `INSERT INTO email_templates (name, subject, body)
       SELECT 'Initial response', 'Your Iceland request — {{agency}}',
         'Hi {{contact}},\n\nThank you for reaching out. We are reviewing your Iceland request and will be back in touch shortly.\n\nBest,\n{{sender}}'
       WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'Initial response')`,
      );
    },
    { transaction: true },
  );
}

export async function listPipelineStages() {
  await ensureAdminSeeded();
  return withDatabase((database) =>
    database.query<{
      id: string;
      name: string;
      category: "open" | "won" | "lost" | "archived";
      color: string;
      position: number;
      active: boolean;
    }>(
      `SELECT id, name, category, color, position, active
       FROM pipeline_stages ORDER BY position`,
    ),
  );
}

export async function listLeads(
  filters: LeadListFilters = {},
): Promise<CursorPage<Lead>> {
  await ensureAdminSeeded();
  const params: unknown[] = [];
  const where: string[] = [
    filters.includeDeleted ? "TRUE" : "l.deleted_at IS NULL",
  ];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.query?.trim()) {
    const searchRef = add(filters.query.trim());
    const ref = add(`%${filters.query.trim()}%`);
    where.push(`(
      to_tsvector('simple', COALESCE(l.title, '') || ' ' || COALESCE(l.summary, '') || ' ' || COALESCE(l.message, '') || ' ' || COALESCE(l.package_code, ''))
        @@ websearch_to_tsquery('simple', ${searchRef})
      OR l.title ILIKE ${ref} OR l.summary ILIKE ${ref} OR l.message ILIKE ${ref}
      OR o.name ILIKE ${ref} OR c.name ILIKE ${ref} OR c.email ILIKE ${ref}
      OR COALESCE(l.package_code, '') ILIKE ${ref}
    )`);
  }
  if (filters.stageId) where.push(`l.stage_id = ${add(filters.stageId)}`);
  if (filters.ownerId === "unassigned") where.push(`l.owner_id IS NULL`);
  else if (filters.ownerId) where.push(`l.owner_id = ${add(filters.ownerId)}`);
  if (filters.priority)
    where.push(`l.priority = ${add(filters.priority)}::lead_priority`);
  if (filters.source) where.push(`l.source = ${add(filters.source)}`);
  if (filters.formType) where.push(`l.form_type = ${add(filters.formType)}`);
  if (filters.country)
    where.push(
      `COALESCE(c.country, o.country, '') ILIKE ${add(filters.country)}`,
    );
  if (filters.packageCode)
    where.push(
      `COALESCE(l.package_code, '') ILIKE ${add(`%${filters.packageCode}%`)}`,
    );
  if (filters.travelDates)
    where.push(
      `COALESCE(l.travel_dates, '') ILIKE ${add(`%${filters.travelDates}%`)}`,
    );
  if (
    filters.customFieldKey &&
    /^[a-z][a-z0-9_]{1,48}$/.test(filters.customFieldKey)
  ) {
    const key = add(filters.customFieldKey);
    if (filters.customFieldValue)
      where.push(
        `COALESCE(l.custom_fields ->> ${key}, '') ILIKE ${add(`%${filters.customFieldValue}%`)}`,
      );
    else where.push(`l.custom_fields ? ${key}`);
  }
  if (filters.due === "overdue") where.push(`l.next_action_at < now()`);
  if (filters.due === "today") {
    where.push(
      `l.next_action_at >= date_trunc('day', now()) AND l.next_action_at < date_trunc('day', now()) + interval '1 day'`,
    );
  }
  if (filters.due === "upcoming")
    where.push(
      `l.next_action_at >= date_trunc('day', now()) + interval '1 day'`,
    );

  const cursor = decodeCursor(filters.cursor);
  if (cursor) {
    const createdRef = add(cursor.createdAt);
    const idRef = add(cursor.id);
    where.push(
      `(l.created_at, l.id) < (${createdRef}::timestamptz, ${idRef}::uuid)`,
    );
  }

  const limit = Math.min(Math.max(filters.limit || 50, 1), 100);
  params.push(limit + 1);
  const rows = await withDatabase((database) =>
    database.query<LeadRow>(
      `${leadSelect()}
       WHERE ${where.join(" AND ")}
       ORDER BY l.created_at DESC, l.id DESC
       LIMIT $${params.length}`,
      params,
    ),
  );
  const hasMore = rows.length > limit;
  const visible = rows.slice(0, limit).map(mapLead);
  const last = visible.at(-1);
  return {
    items: visible,
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

export async function getLeadDetail(id: string): Promise<LeadDetail | null> {
  const rows = await withDatabase((database) =>
    database.query<LeadRow>(`${leadSelect()} WHERE l.id = $1`, [id]),
  );
  if (!rows[0]) return null;
  const [events, tasks, emails] = await Promise.all([
    listLeadEvents(id),
    listTasks({ leadId: id, allProfiles: true }),
    withDatabase((database) =>
      database.query<{
        id: string;
        lead_id: string;
        profile_id: string;
        to_email: string;
        subject: string;
        body: string;
        status: EmailMessage["status"];
        provider_message_id: string | null;
        sent_at: Date | string | null;
        created_at: Date | string;
        delivered_at: Date | string | null;
        failure_reason: string | null;
      }>(
        `SELECT id, lead_id, profile_id, to_email, subject, body, status,
          provider_message_id, sent_at, created_at, delivered_at, failure_reason
         FROM email_messages WHERE lead_id = $1 ORDER BY created_at DESC`,
        [id],
      ),
    ),
  ]);
  return {
    lead: mapLead(rows[0]),
    events,
    tasks,
    emails: emails.map((email) => ({
      id: email.id,
      leadId: email.lead_id,
      profileId: email.profile_id,
      toEmail: email.to_email,
      subject: email.subject,
      body: email.body,
      status: email.status,
      providerMessageId: email.provider_message_id,
      sentAt: email.sent_at ? iso(email.sent_at) : null,
      createdAt: iso(email.created_at),
      deliveredAt: email.delivered_at ? iso(email.delivered_at) : null,
      failureReason: email.failure_reason,
    })),
  };
}

export async function updateLead(
  actor: AdminProfile,
  id: string,
  patch: {
    version: number;
    stageId?: string;
    ownerId?: string | null;
    priority?: LeadPriority;
    nextActionAt?: string | null;
    tags?: string[];
    customFields?: Record<string, unknown>;
    contactCustomFields?: Record<string, unknown>;
    organizationCustomFields?: Record<string, unknown>;
  },
): Promise<Lead> {
  await withDatabase(
    async (database) => {
      const current = await database.query<{
        version: number;
        stage_id: string;
        owner_id: string | null;
        priority: LeadPriority;
        next_action_at: Date | string | null;
        contact_id: string;
        organization_id: string;
      }>(
        `SELECT version, stage_id, owner_id, priority, next_action_at, contact_id, organization_id
       FROM leads WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [id],
      );
      if (!current[0]) throw new HttpError(404, "Lead not found.");
      if (current[0].version !== patch.version) {
        throw new HttpError(
          409,
          "This lead changed in another session. Refresh before saving.",
        );
      }

      const values: unknown[] = [id, patch.version];
      const sets = ["version = version + 1", "updated_at = now()"];
      const set = (column: string, value: unknown, cast = "") => {
        values.push(value);
        sets.push(`${column} = $${values.length}${cast}`);
      };
      if (patch.stageId !== undefined) set("stage_id", patch.stageId, "::uuid");
      if (patch.ownerId !== undefined) set("owner_id", patch.ownerId, "::uuid");
      if (patch.priority !== undefined)
        set("priority", patch.priority, "::lead_priority");
      if (patch.nextActionAt !== undefined)
        set("next_action_at", patch.nextActionAt, "::timestamptz");
      if (patch.customFields !== undefined)
        set("custom_fields", JSON.stringify(patch.customFields), "::jsonb");

      const updated = await database.query<{ id: string }>(
        `UPDATE leads SET ${sets.join(", ")}
       WHERE id = $1 AND version = $2 RETURNING id`,
        values,
      );
      if (!updated[0])
        throw new HttpError(409, "This lead changed in another session.");

      if (patch.contactCustomFields !== undefined) {
        await database.query(
          `UPDATE contacts SET custom_fields = $2::jsonb, updated_at = now() WHERE id = $1`,
          [current[0].contact_id, JSON.stringify(patch.contactCustomFields)],
        );
      }
      if (patch.organizationCustomFields !== undefined) {
        await database.query(
          `UPDATE organizations SET custom_fields = $2::jsonb, updated_at = now() WHERE id = $1`,
          [
            current[0].organization_id,
            JSON.stringify(patch.organizationCustomFields),
          ],
        );
      }
      if (patch.tags) await replaceLeadTags(database, id, patch.tags);
      if (patch.stageId && patch.stageId !== current[0].stage_id) {
        const stage = await database.query<{ name: string }>(
          `SELECT name FROM pipeline_stages WHERE id = $1`,
          [patch.stageId],
        );
        await insertEvent(
          database,
          id,
          actor.id,
          "stage.changed",
          `Moved to ${stage[0]?.name || "another stage"}.`,
          {
            from: current[0].stage_id,
            to: patch.stageId,
          },
        );
      }
      if (
        patch.ownerId !== undefined &&
        patch.ownerId !== current[0].owner_id
      ) {
        const owner = patch.ownerId
          ? await database.query<{ name: string }>(
              `SELECT name FROM admin_profiles WHERE id = $1`,
              [patch.ownerId],
            )
          : [];
        await insertEvent(
          database,
          id,
          actor.id,
          "owner.changed",
          patch.ownerId
            ? `Assigned to ${owner[0]?.name || "a teammate"}.`
            : "Marked unassigned.",
          {
            from: current[0].owner_id,
            to: patch.ownerId,
          },
        );
        if (patch.ownerId) {
          // Intake follow-ups start unassigned when no assignment rule matches.
          // Claim those open tasks with the lead so the new owner immediately
          // sees the work in My Work; never overwrite an explicit task assignee.
          await database.query(
            `UPDATE tasks
           SET assignee_id = $2, updated_at = now()
           WHERE lead_id = $1 AND status = 'open' AND assignee_id IS NULL`,
            [id, patch.ownerId],
          );
          await createNotification(
            database,
            patch.ownerId,
            "lead.assigned",
            "A lead was assigned to you",
            "Open it to plan the next response.",
            `/admin/leads/${id}`,
            `lead-assigned:${id}:${patch.ownerId}:${patch.version + 1}`,
          );
        }
      }
      await audit(database, actor.id, "lead.updated", "lead", id, {
        fields: Object.keys(patch),
      });
    },
    { transaction: true },
  );

  const detail = await getLeadDetail(id);
  if (!detail) throw new HttpError(404, "Lead not found.");
  return detail.lead;
}

export async function trashLead(actor: AdminProfile, id: string) {
  if (!actor.roles.includes("owner"))
    throw new HttpError(403, "Only an Owner can move leads to trash.");
  await withDatabase(
    async (database) => {
      const changed = await database.query<{ id: string }>(
        `UPDATE leads SET deleted_at = now(), updated_at = now(), version = version + 1
       WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [id],
      );
      if (!changed[0]) throw new HttpError(404, "Lead not found.");
      await audit(database, actor.id, "lead.trashed", "lead", id);
    },
    { transaction: true },
  );
}

export async function addLeadEvent(
  actor: AdminProfile,
  leadId: string,
  type: "note" | "call",
  body: string,
) {
  const trimmed = body.trim();
  if (!trimmed) throw new HttpError(400, "Write a note first.");
  await withDatabase(
    async (database) => {
      const lead = await database.query<{ id: string }>(
        `SELECT id FROM leads WHERE id = $1 AND deleted_at IS NULL`,
        [leadId],
      );
      if (!lead[0]) throw new HttpError(404, "Lead not found.");
      await insertEvent(database, leadId, actor.id, type, trimmed);
      await notifyMentions(database, actor, leadId, trimmed);
      await audit(database, actor.id, `lead.${type}.created`, "lead", leadId);
    },
    { transaction: true },
  );
}

export async function listLeadEvents(leadId: string): Promise<LeadEvent[]> {
  const rows = await withDatabase((database) =>
    database.query<EventRow>(
      `SELECT e.id, e.lead_id, e.profile_id, p.name AS profile_name,
        e.type, e.body, e.metadata, e.created_at
       FROM lead_events e LEFT JOIN admin_profiles p ON p.id = e.profile_id
       WHERE e.lead_id = $1 ORDER BY e.created_at DESC`,
      [leadId],
    ),
  );
  return rows.map(mapEvent);
}

export async function listTasks(options: {
  profileId?: string;
  leadId?: string;
  allProfiles?: boolean;
  includeCompleted?: boolean;
}): Promise<Task[]> {
  const params: unknown[] = [];
  const where = [options.includeCompleted ? "TRUE" : "t.status <> 'cancelled'"];
  if (options.leadId) {
    params.push(options.leadId);
    where.push(`t.lead_id = $${params.length}`);
  }
  if (options.profileId && !options.allProfiles) {
    params.push(options.profileId);
    where.push(`t.assignee_id = $${params.length}`);
  }
  const rows = await withDatabase((database) =>
    database.query<TaskRow>(
      `SELECT t.id, t.lead_id, t.assignee_id, t.title, t.notes, t.due_at,
        t.status, t.completed_at, t.created_at
       FROM tasks t WHERE ${where.join(" AND ")}
       ORDER BY CASE WHEN t.status = 'open' THEN 0 ELSE 1 END, t.due_at, t.created_at DESC`,
      params,
    ),
  );
  return rows.map(mapTask);
}

export async function createTask(
  actor: AdminProfile,
  input: {
    leadId?: string | null;
    assigneeId?: string | null;
    title: string;
    notes?: string;
    dueAt: string;
  },
) {
  const id = crypto.randomUUID();
  await withDatabase(
    async (database) => {
      await database.query(
        `INSERT INTO tasks (id, lead_id, assignee_id, title, notes, due_at)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
        [
          id,
          input.leadId || null,
          input.assigneeId || actor.id,
          input.title.trim(),
          input.notes?.trim() || "",
          input.dueAt,
        ],
      );
      if (input.leadId)
        await insertEvent(
          database,
          input.leadId,
          actor.id,
          "task.created",
          input.title.trim(),
          { taskId: id, dueAt: input.dueAt },
        );
      if (input.assigneeId && input.assigneeId !== actor.id) {
        await createNotification(
          database,
          input.assigneeId,
          "task.assigned",
          "A task was assigned to you",
          input.title.trim(),
          input.leadId ? `/admin/leads/${input.leadId}` : "/admin/work",
          `task-assigned:${id}`,
        );
      }
      await audit(database, actor.id, "task.created", "task", id);
    },
    { transaction: true },
  );
  return id;
}

export async function updateTask(
  actor: AdminProfile,
  id: string,
  patch: {
    status?: "open" | "completed" | "cancelled";
    dueAt?: string;
    assigneeId?: string | null;
  },
) {
  await withDatabase(
    async (database) => {
      const current = await database.query<{
        lead_id: string | null;
        title: string;
      }>(`SELECT lead_id, title FROM tasks WHERE id = $1 FOR UPDATE`, [id]);
      if (!current[0]) throw new HttpError(404, "Task not found.");
      const params: unknown[] = [id];
      const sets = ["updated_at = now()"];
      if (patch.status) {
        params.push(patch.status);
        sets.push(`status = $${params.length}::task_status`);
        sets.push(
          patch.status === "completed"
            ? "completed_at = now()"
            : "completed_at = NULL",
        );
      }
      if (patch.dueAt) {
        params.push(patch.dueAt);
        sets.push(`due_at = $${params.length}::timestamptz`);
      }
      if (patch.assigneeId !== undefined) {
        params.push(patch.assigneeId);
        sets.push(`assignee_id = $${params.length}::uuid`);
      }
      await database.query(
        `UPDATE tasks SET ${sets.join(", ")} WHERE id = $1`,
        params,
      );
      if (current[0].lead_id) {
        await insertEvent(
          database,
          current[0].lead_id,
          actor.id,
          patch.status === "completed" ? "task.completed" : "task.updated",
          current[0].title,
          { taskId: id, ...patch },
        );
      }
      await audit(database, actor.id, "task.updated", "task", id, patch);
    },
    { transaction: true },
  );
}

export async function getDashboard(
  profile: AdminProfile,
): Promise<AdminDashboard> {
  await ensureAdminSeeded();
  const [
    counts,
    recentLeads,
    upcomingTasks,
    recentActivity,
    releases,
    workspaceRows,
    slaLeads,
  ] = await Promise.all([
    withDatabase((database) =>
      database.query<{
        new_leads: number;
        unassigned_leads: number;
        overdue_tasks: number;
        unread_notifications: number;
        unread_mentions: number;
        failed_emails: number;
        draft_content: number;
      }>(
        `SELECT
          (SELECT count(*)::int FROM leads l JOIN pipeline_stages s ON s.id = l.stage_id
           WHERE l.deleted_at IS NULL AND s.category = 'open' AND s.position = (
             SELECT min(position) FROM pipeline_stages WHERE active = true AND category = 'open'
           )) AS new_leads,
          (SELECT count(*)::int FROM leads WHERE deleted_at IS NULL AND owner_id IS NULL) AS unassigned_leads,
          (SELECT count(*)::int FROM tasks WHERE status = 'open' AND due_at < now() AND (assignee_id = $1 OR $2)) AS overdue_tasks,
          (SELECT count(*)::int FROM notifications WHERE profile_id = $1 AND read_at IS NULL AND dismissed_at IS NULL) AS unread_notifications,
          (SELECT count(*)::int FROM notifications WHERE profile_id = $1 AND type = 'mention' AND read_at IS NULL AND dismissed_at IS NULL) AS unread_mentions,
          (SELECT count(*)::int FROM email_messages WHERE status IN ('failed', 'bounced')) AS failed_emails,
          (SELECT count(*)::int FROM content_entries WHERE draft_revision_id IS DISTINCT FROM published_revision_id AND deleted_at IS NULL) AS draft_content`,
        [profile.id, profile.roles.includes("owner")],
      ),
    ),
    listLeads({ limit: 6 }),
    listTasks({ profileId: profile.id }),
    withDatabase((database) =>
      database.query<EventRow>(
        `SELECT e.id, e.lead_id, e.profile_id, p.name AS profile_name, e.type,
          e.body, e.metadata, e.created_at
         FROM lead_events e LEFT JOIN admin_profiles p ON p.id = e.profile_id
         ORDER BY e.created_at DESC LIMIT 10`,
      ),
    ),
    withDatabase((database) =>
      database.query<{
        id: string;
        number: number;
        status: "draft" | "queued" | "deploying" | "live" | "failed";
        profile_id: string;
        note: string;
        deploy_job_id: string | null;
        failure_reason: string | null;
        created_at: Date | string;
        live_at: Date | string | null;
      }>(`SELECT * FROM content_releases ORDER BY number DESC LIMIT 1`),
    ),
    withDatabase((database) =>
      database.query<{ value: unknown }>(
        `SELECT value FROM app_settings WHERE key = 'workspace'`,
      ),
    ),
    withDatabase((database) =>
      database.query<{ created_at: Date | string }>(
        `SELECT l.created_at
         FROM leads l JOIN pipeline_stages s ON s.id = l.stage_id
         WHERE l.deleted_at IS NULL AND l.first_responded_at IS NULL AND s.category = 'open'
           AND (l.owner_id = $1 OR $2)`,
        [profile.id, profile.roles.includes("owner")],
      ),
    ),
  ]);
  const count = counts[0];
  const schedule = workspaceSchedule(workspaceRows[0]?.value);
  const slaBreaches = slaLeads.filter(
    (lead) =>
      businessMinutesBetween(lead.created_at, new Date(), schedule) >=
      schedule.firstResponseSlaHours * 60,
  ).length;
  return {
    counts: {
      newLeads: count?.new_leads || 0,
      unassignedLeads: count?.unassigned_leads || 0,
      overdueTasks: count?.overdue_tasks || 0,
      unreadNotifications: count?.unread_notifications || 0,
      unreadMentions: count?.unread_mentions || 0,
      slaBreaches,
      failedEmails: count?.failed_emails || 0,
      draftContent: count?.draft_content || 0,
    },
    recentLeads: recentLeads.items,
    upcomingTasks: upcomingTasks
      .filter((task) => task.status === "open")
      .slice(0, 8),
    recentActivity: recentActivity.map(mapEvent),
    latestRelease: releases[0]
      ? {
          id: releases[0].id,
          number: releases[0].number,
          status: releases[0].status,
          profileId: releases[0].profile_id,
          note: releases[0].note,
          deployJobId: releases[0].deploy_job_id,
          failureReason: releases[0].failure_reason,
          createdAt: iso(releases[0].created_at),
          liveAt: releases[0].live_at ? iso(releases[0].live_at) : null,
        }
      : null,
  };
}

export async function listNotifications(
  profileId: string,
  includeRead = false,
): Promise<AdminNotification[]> {
  const rows = await withDatabase((database) =>
    database.query<NotificationRow>(
      `SELECT id, profile_id, type, title, body, href, read_at, dismissed_at, created_at
       FROM notifications
       WHERE profile_id = $1 AND dismissed_at IS NULL ${includeRead ? "" : "AND read_at IS NULL"}
       ORDER BY created_at DESC LIMIT 100`,
      [profileId],
    ),
  );
  return rows.map(mapNotification);
}

export async function updateNotification(
  profileId: string,
  id: string,
  action: "read" | "unread" | "dismiss",
) {
  const set =
    action === "read"
      ? "read_at = now()"
      : action === "unread"
        ? "read_at = NULL"
        : "dismissed_at = now()";
  await withDatabase((database) =>
    database.query(
      `UPDATE notifications SET ${set} WHERE id = $1 AND profile_id = $2`,
      [id, profileId],
    ),
  );
}

export async function markAllNotificationsRead(profileId: string) {
  await withDatabase((database) =>
    database.query(
      `UPDATE notifications SET read_at = now() WHERE profile_id = $1 AND read_at IS NULL`,
      [profileId],
    ),
  );
}

export async function getAnalytics(days = 30): Promise<LeadAnalytics> {
  const safeDays = Math.min(Math.max(days, 1), 365);
  const [
    totals,
    stages,
    sources,
    owners,
    markets,
    packages,
    travelTypes,
    trend,
    workspaceRows,
    responseRows,
  ] = await Promise.all([
    withDatabase((database) =>
      database.query<{
        leads: number;
        won: number;
      }>(
        `SELECT count(*)::int AS leads,
          count(*) FILTER (WHERE s.category = 'won')::int AS won
         FROM leads l JOIN pipeline_stages s ON s.id = l.stage_id
         WHERE l.deleted_at IS NULL AND l.created_at >= now() - ($1::text || ' days')::interval`,
        [safeDays],
      ),
    ),
    analyticsGroup(
      `s.name`,
      `s.color`,
      `JOIN pipeline_stages s ON s.id = l.stage_id`,
      safeDays,
    ),
    analyticsGroup(
      `COALESCE(NULLIF(l.source, ''), 'Unknown')`,
      null,
      "",
      safeDays,
    ),
    analyticsGroup(
      `COALESCE(p.name, 'Unassigned')`,
      null,
      `LEFT JOIN admin_profiles p ON p.id = l.owner_id`,
      safeDays,
    ),
    analyticsGroup(
      `COALESCE(NULLIF(c.country, ''), NULLIF(o.country, ''), 'Unknown')`,
      null,
      `LEFT JOIN contacts c ON c.id = l.contact_id LEFT JOIN organizations o ON o.id = l.organization_id`,
      safeDays,
    ),
    analyticsGroup(
      `COALESCE(NULLIF(l.package_code, ''), 'General inquiry')`,
      null,
      "",
      safeDays,
    ),
    analyticsGroup(
      `COALESCE(NULLIF(l.travel_type, ''), 'Not specified')`,
      null,
      "",
      safeDays,
    ),
    withDatabase((database) =>
      database.query<{ date: string; value: number }>(
        `SELECT to_char(day, 'YYYY-MM-DD') AS date, count(l.id)::int AS value
         FROM generate_series(
           date_trunc('day', now() - ($1::text || ' days')::interval),
           date_trunc('day', now()), interval '1 day'
         ) day
         LEFT JOIN leads l ON date_trunc('day', l.created_at) = day AND l.deleted_at IS NULL
         GROUP BY day ORDER BY day`,
        [safeDays - 1],
      ),
    ),
    withDatabase((database) =>
      database.query<{ value: unknown }>(
        `SELECT value FROM app_settings WHERE key = 'workspace'`,
      ),
    ),
    withDatabase((database) =>
      database.query<{
        created_at: Date | string;
        first_responded_at: Date | string;
      }>(
        `SELECT created_at, first_responded_at
         FROM leads
         WHERE deleted_at IS NULL AND first_responded_at IS NOT NULL
           AND created_at >= now() - ($1::text || ' days')::interval`,
        [safeDays],
      ),
    ),
  ]);
  const total = totals[0] || { leads: 0, won: 0 };
  const schedule = workspaceSchedule(workspaceRows[0]?.value);
  const responseMinutes = responseRows
    .map((row) =>
      businessMinutesBetween(row.created_at, row.first_responded_at, schedule),
    )
    .sort((a, b) => a - b);
  const withinSla = responseMinutes.filter(
    (minutes) => minutes <= schedule.firstResponseSlaHours * 60,
  ).length;
  return {
    totals: {
      leads: total.leads,
      won: total.won,
      conversionRate: total.leads
        ? Math.round((total.won / total.leads) * 1000) / 10
        : 0,
      medianFirstResponseMinutes: responseMinutes.length
        ? median(responseMinutes)
        : null,
      slaPercent: responseMinutes.length
        ? Math.round((withinSla / responseMinutes.length) * 1000) / 10
        : null,
      firstResponseSlaHours: schedule.firstResponseSlaHours,
    },
    byStage: stages.map((row) => ({
      label: row.label,
      value: row.value,
      color: row.color || "#6B7280",
    })),
    bySource: sources.map((row) => ({ label: row.label, value: row.value })),
    byOwner: owners.map((row) => ({ label: row.label, value: row.value })),
    byMarket: markets.map((row) => ({ label: row.label, value: row.value })),
    byPackage: packages.map((row) => ({ label: row.label, value: row.value })),
    byTravelType: travelTypes.map((row) => ({
      label: row.label,
      value: row.value,
    })),
    trend,
  };
}

export async function createLeadFromInquiry(options: {
  input: InquiryInput;
  idempotencyKey: string;
  ipHash: string;
  referer: string;
  userAgent: string;
}) {
  await ensureAdminSeeded();
  return withDatabase(
    async (database) => {
      const cached = await database.query<{
        response: Record<string, unknown>;
      }>(
        `SELECT response FROM idempotency_keys WHERE key = $1 AND scope = 'inquiry' AND expires_at > now()`,
        [options.idempotencyKey],
      );
      if (cached[0]) return cached[0].response;

      const input = options.input;
      const normalizedOrganization = normalize(input.agency);
      const normalizedEmail = normalize(input.email);
      const organizationId = crypto.randomUUID();
      const contactId = crypto.randomUUID();
      const leadId = crypto.randomUUID();

      const organizations = await database.query<{ id: string }>(
        `INSERT INTO organizations (id, name, normalized_name, country)
       VALUES ($1, $2, $3, NULLIF($4, ''))
       ON CONFLICT (normalized_name) DO UPDATE SET
         name = EXCLUDED.name,
         country = COALESCE(NULLIF(EXCLUDED.country, ''), organizations.country),
         updated_at = now()
       RETURNING id`,
        [organizationId, input.agency, normalizedOrganization, input.country],
      );
      const resolvedOrganizationId = organizations[0]!.id;

      const contacts = await database.query<{ id: string }>(
        `INSERT INTO contacts
        (id, organization_id, name, email, normalized_email, phone, country)
       VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''))
       ON CONFLICT (normalized_email) DO UPDATE SET
         organization_id = EXCLUDED.organization_id,
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         phone = COALESCE(NULLIF(EXCLUDED.phone, ''), contacts.phone),
         country = COALESCE(NULLIF(EXCLUDED.country, ''), contacts.country),
         updated_at = now()
       RETURNING id`,
        [
          contactId,
          resolvedOrganizationId,
          input.contact,
          input.email,
          normalizedEmail,
          input.phone,
          input.country,
        ],
      );
      const resolvedContactId = contacts[0]!.id;

      const duplicateRows = await database.query<{ exists: boolean }>(
        `SELECT EXISTS(
        SELECT 1 FROM leads WHERE contact_id = $1 AND deleted_at IS NULL
          AND created_at >= now() - interval '90 days'
      ) AS exists`,
        [resolvedContactId],
      );
      const stage = await database.query<{ id: string }>(
        `SELECT id FROM pipeline_stages WHERE category = 'open' AND active = true ORDER BY position LIMIT 1`,
      );
      if (!stage[0]) throw new Error("The New pipeline stage is missing.");
      const ownerId = await resolveAssignment(database, input);
      const workspaceRows = await database.query<{ value: unknown }>(
        `SELECT value FROM app_settings WHERE key = 'workspace'`,
      );
      const nextActionAt = scheduledNextBusinessDay(
        new Date(),
        workspaceRows[0]?.value,
      );
      const formType = formTypeFromSourcePage(input.sourcePage);
      const source = input.utmSource || "website";

      await database.query(
        `INSERT INTO leads (
        id, organization_id, contact_id, stage_id, owner_id, title, summary, message,
        source, source_page, form_type, package_code, travel_dates, pax, travel_type,
        duplicate, consent_version, utm, next_action_at, ip_hash, ip_hash_expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        NULLIF($12, ''), NULLIF($13, ''), NULLIF($14, ''), NULLIF($15, ''),
        $16, $17, $18::jsonb, $19, $20, now() + interval '24 hours'
      )`,
        [
          leadId,
          resolvedOrganizationId,
          resolvedContactId,
          stage[0].id,
          ownerId,
          `${input.agency} — ${input.packageCode || "General inquiry"}`,
          input.message.slice(0, 240),
          input.message,
          source,
          input.sourcePage,
          formType,
          input.packageCode,
          input.travelDates,
          input.pax,
          input.groupType,
          duplicateRows[0]?.exists || false,
          input.consentVersion,
          JSON.stringify({
            source: input.utmSource,
            medium: input.utmMedium,
            campaign: input.utmCampaign,
          }),
          nextActionAt,
          options.ipHash,
        ],
      );
      await insertEvent(
        database,
        leadId,
        null,
        "lead.created",
        "Website inquiry received.",
        {
          formType,
          referer: options.referer.slice(0, 500),
          userAgent: options.userAgent.slice(0, 500),
        },
      );
      await database.query(
        `INSERT INTO tasks (lead_id, assignee_id, title, notes, due_at)
       VALUES ($1, $2, 'Follow up on new inquiry', 'Review the request and send the first response.', $3)`,
        [leadId, ownerId, nextActionAt],
      );

      if (ownerId) {
        await createNotification(
          database,
          ownerId,
          "lead.assigned",
          "New lead assigned to you",
          `${input.agency} · ${input.contact}`,
          `/admin/leads/${leadId}`,
          `intake:${leadId}:${ownerId}`,
        );
      } else {
        const sales = await database.query<{ id: string }>(
          `SELECT DISTINCT p.id FROM admin_profiles p
         JOIN admin_profile_roles r ON r.profile_id = p.id
         WHERE p.active = true AND r.role IN ('sales', 'owner')`,
        );
        for (const profile of sales) {
          await createNotification(
            database,
            profile.id,
            "lead.new",
            "New unassigned lead",
            `${input.agency} · ${input.contact}`,
            `/admin/leads/${leadId}`,
            `intake:${leadId}:${profile.id}`,
          );
        }
      }

      const response = {
        ok: true,
        id: leadId,
        duplicate: duplicateRows[0]?.exists || false,
      };
      await database.query(
        `INSERT INTO idempotency_keys (key, scope, response, expires_at)
       VALUES ($1, 'inquiry', $2::jsonb, now() + interval '24 hours')`,
        [options.idempotencyKey, JSON.stringify(response)],
      );
      return response;
    },
    { transaction: true },
  );
}

export async function checkIntakeRateLimit(ipHash: string) {
  const key = `intake:${ipHash}`;
  return withDatabase(async (database) => {
    const rows = await database.query<{
      count: number;
      window_started_at: Date | string;
    }>(
      `INSERT INTO admin_auth_attempts (key, count, window_started_at)
       VALUES ($1, 1, now())
       ON CONFLICT (key) DO UPDATE SET
         count = CASE
           WHEN admin_auth_attempts.window_started_at < now() - interval '15 minutes' THEN 1
           ELSE admin_auth_attempts.count + 1
         END,
         window_started_at = CASE
           WHEN admin_auth_attempts.window_started_at < now() - interval '15 minutes' THEN now()
           ELSE admin_auth_attempts.window_started_at
         END
       RETURNING count, window_started_at`,
      [key],
    );
    if ((rows[0]?.count || 0) > 10) {
      throw new HttpError(
        429,
        "Too many requests. Please try again in 15 minutes.",
      );
    }
  });
}

export async function exportLeadsCsv(
  filters: LeadListFilters,
  actor: AdminProfile,
) {
  const items: Lead[] = [];
  let cursor: string | undefined;
  do {
    const result = await listLeads({ ...filters, cursor, limit: 100 });
    items.push(...result.items);
    cursor = result.nextCursor || undefined;
  } while (cursor && items.length < 10_000);
  const rows = [
    [
      "Created",
      "Stage",
      "Priority",
      "Owner",
      "Agency",
      "Contact",
      "Email",
      "Country",
      "Package",
      "Travel dates",
      "Pax",
      "Source",
    ],
    ...items.map((lead) => [
      lead.createdAt,
      lead.stage.name,
      lead.priority,
      lead.owner?.name || "Unassigned",
      lead.organization.name,
      lead.contact.name,
      lead.contact.email,
      lead.contact.country || lead.organization.country || "",
      lead.packageCode || "",
      lead.travelDates || "",
      lead.pax || "",
      lead.source,
    ]),
  ];
  await withDatabase((database) =>
    audit(database, actor.id, "lead.exported", "lead", null, {
      count: items.length,
      filters,
      truncated: items.length >= 10_000,
    }),
  );
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

async function analyticsGroup(
  label: string,
  color: string | null,
  join: string,
  days: number,
) {
  return withDatabase((database) =>
    database.query<{ label: string; value: number; color: string | null }>(
      `SELECT ${label} AS label, count(*)::int AS value, ${color || "NULL::text"} AS color
       FROM leads l ${join}
       WHERE l.deleted_at IS NULL AND l.created_at >= now() - ($1::text || ' days')::interval
       GROUP BY ${label}${color ? `, ${color}` : ""}
       ORDER BY value DESC`,
      [days],
    ),
  );
}

async function resolveAssignment(
  database: DatabaseSession,
  input: InquiryInput,
) {
  const settings = await database.query<{
    value: Array<{ field: string; value: string; profileId: string }>;
  }>(`SELECT value FROM app_settings WHERE key = 'assignment_rules'`);
  for (const rule of settings[0]?.value || []) {
    const actual =
      rule.field === "country"
        ? input.country
        : rule.field === "formType"
          ? formTypeFromSourcePage(input.sourcePage)
          : rule.field === "packageCode"
            ? input.packageCode
            : "";
    if (normalize(actual) === normalize(rule.value)) {
      const profile = await database.query<{ id: string }>(
        `SELECT p.id FROM admin_profiles p
         WHERE p.id = $1 AND p.active = true AND EXISTS (
           SELECT 1 FROM admin_profile_roles r
           WHERE r.profile_id = p.id AND r.role IN ('sales', 'owner')
         )`,
        [rule.profileId],
      );
      if (profile[0]) return profile[0].id;
    }
  }
  return null;
}

async function replaceLeadTags(
  database: DatabaseSession,
  leadId: string,
  names: string[],
) {
  await database.query(`DELETE FROM lead_tags WHERE lead_id = $1`, [leadId]);
  for (const raw of [
    ...new Set(names.map((name) => name.trim()).filter(Boolean)),
  ]) {
    const rows = await database.query<{ id: string }>(
      `INSERT INTO tags (name, normalized_name)
       VALUES ($1, $2)
       ON CONFLICT (normalized_name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [raw, normalize(raw)],
    );
    await database.query(
      `INSERT INTO lead_tags (lead_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [leadId, rows[0]!.id],
    );
  }
}

async function insertEvent(
  database: DatabaseSession,
  leadId: string,
  profileId: string | null,
  type: string,
  body: string,
  metadata: Record<string, unknown> = {},
) {
  await database.query(
    `INSERT INTO lead_events (lead_id, profile_id, type, body, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [leadId, profileId, type, body, JSON.stringify(metadata)],
  );
}

async function createNotification(
  database: DatabaseSession,
  profileId: string,
  type: string,
  title: string,
  body: string,
  href: string,
  dedupeKey: string,
) {
  await database.query(
    `INSERT INTO notifications (profile_id, type, title, body, href, dedupe_key)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (profile_id, dedupe_key) DO NOTHING`,
    [profileId, type, title, body, href, dedupeKey],
  );
}

async function notifyMentions(
  database: DatabaseSession,
  actor: AdminProfile,
  leadId: string,
  body: string,
) {
  const names = [
    ...body.matchAll(/@([\p{L}\p{N}][\p{L}\p{N} .'-]{0,78})/gu),
  ].map((match) => normalize(match[1] || ""));
  if (!names.length) return;
  const profiles = await database.query<{
    id: string;
    normalized_name: string;
  }>(`SELECT id, normalized_name FROM admin_profiles WHERE active = true`);
  for (const profile of profiles) {
    if (
      profile.id === actor.id ||
      !names.some((name) => name.startsWith(profile.normalized_name))
    )
      continue;
    await createNotification(
      database,
      profile.id,
      "mention",
      `${actor.name} mentioned you`,
      body.slice(0, 180),
      `/admin/leads/${leadId}`,
      `mention:${leadId}:${profile.id}:${hash(body)}`,
    );
  }
}

function leadSelect() {
  return `SELECT
    l.id, l.legacy_id, l.title, l.summary, l.message, l.source, l.source_page,
    l.form_type, l.package_code, l.travel_dates, l.pax, l.travel_type,
    l.priority, l.duplicate, l.custom_fields, l.first_responded_at,
    l.next_action_at, l.version, l.created_at, l.updated_at, l.deleted_at,
    o.id AS organization_id, o.name AS organization_name,
    o.country AS organization_country, o.website AS organization_website,
    o.custom_fields AS organization_custom_fields,
    c.id AS contact_id, c.name AS contact_name, c.email AS contact_email,
    c.phone AS contact_phone, c.country AS contact_country,
    c.custom_fields AS contact_custom_fields,
    s.id AS stage_id, s.name AS stage_name, s.category AS stage_category,
    s.color AS stage_color, s.position AS stage_position, s.active AS stage_active,
    p.id AS owner_id, p.name AS owner_name, p.email AS owner_email,
    p.color AS owner_color, p.active AS owner_active,
    p.created_at AS owner_created_at, p.last_seen_at AS owner_last_seen_at,
    COALESCE((SELECT array_agg(pr.role) FROM admin_profile_roles pr WHERE pr.profile_id = p.id), '{}') AS owner_roles,
    COALESCE((SELECT array_agg(t.name ORDER BY t.name) FROM lead_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.lead_id = l.id), '{}') AS tag_names
   FROM leads l
   JOIN organizations o ON o.id = l.organization_id
   JOIN contacts c ON c.id = l.contact_id
   JOIN pipeline_stages s ON s.id = l.stage_id
   LEFT JOIN admin_profiles p ON p.id = l.owner_id`;
}

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    legacyId: row.legacy_id,
    organization: {
      id: row.organization_id,
      name: row.organization_name,
      country: row.organization_country,
      website: row.organization_website,
      customFields: row.organization_custom_fields || {},
    },
    contact: {
      id: row.contact_id,
      organizationId: row.organization_id,
      name: row.contact_name,
      email: row.contact_email,
      phone: row.contact_phone,
      country: row.contact_country,
      customFields: row.contact_custom_fields || {},
    },
    stage: {
      id: row.stage_id,
      name: row.stage_name,
      category: row.stage_category,
      color: row.stage_color,
      position: row.stage_position,
      active: row.stage_active,
    },
    owner: row.owner_id
      ? {
          id: row.owner_id,
          name: row.owner_name || "Unknown",
          email: row.owner_email,
          color: row.owner_color || "#315D70",
          roles: parseDatabaseArray(row.owner_roles) as AdminProfile["roles"],
          active: row.owner_active ?? false,
          createdAt: row.owner_created_at
            ? iso(row.owner_created_at)
            : row.created_at
              ? iso(row.created_at)
              : new Date(0).toISOString(),
          lastSeenAt: row.owner_last_seen_at
            ? iso(row.owner_last_seen_at)
            : null,
        }
      : null,
    title: row.title,
    summary: row.summary,
    message: row.message,
    source: row.source,
    sourcePage: row.source_page,
    formType: row.form_type,
    packageCode: row.package_code,
    travelDates: row.travel_dates,
    pax: row.pax,
    travelType: row.travel_type,
    priority: row.priority,
    duplicate: row.duplicate,
    tags: parseDatabaseArray(row.tag_names),
    customFields: row.custom_fields || {},
    firstRespondedAt: row.first_responded_at
      ? iso(row.first_responded_at)
      : null,
    nextActionAt: row.next_action_at ? iso(row.next_action_at) : null,
    version: row.version,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    deletedAt: row.deleted_at ? iso(row.deleted_at) : null,
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    leadId: row.lead_id,
    assigneeId: row.assignee_id,
    title: row.title,
    notes: row.notes,
    dueAt: iso(row.due_at),
    status: row.status,
    completedAt: row.completed_at ? iso(row.completed_at) : null,
    createdAt: iso(row.created_at),
  };
}

function mapEvent(row: EventRow): LeadEvent {
  return {
    id: row.id,
    leadId: row.lead_id,
    profileId: row.profile_id,
    profileName: row.profile_name,
    type: row.type,
    body: row.body,
    metadata: row.metadata || {},
    createdAt: iso(row.created_at),
  };
}

function mapNotification(row: NotificationRow): AdminNotification {
  return {
    id: row.id,
    profileId: row.profile_id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.read_at ? iso(row.read_at) : null,
    dismissedAt: row.dismissed_at ? iso(row.dismissed_at) : null,
    createdAt: iso(row.created_at),
  };
}

export function nextBusinessDay(
  from = new Date(),
  schedule?: WorkspaceSchedule | unknown,
) {
  return scheduledNextBusinessDay(from, schedule);
}

export function neutralizeCsv(value: unknown) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value: unknown) {
  return `"${neutralizeCsv(value).replace(/"/g, '""')}"`;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
}

function median(values: number[]) {
  const middle = Math.floor(values.length / 2);
  return Math.round(
    values.length % 2
      ? values[middle]!
      : (values[middle - 1]! + values[middle]!) / 2,
  );
}

function parseDatabaseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (
    typeof value !== "string" ||
    !value.startsWith("{") ||
    !value.endsWith("}")
  )
    return [];
  return value
    .slice(1, -1)
    .split(",")
    .map((item) => item.replace(/^"|"$/g, "").replace(/\\"/g, '"'))
    .filter(Boolean);
}

function encodeCursor(createdAt: string, id: string) {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString("base64url");
}

function decodeCursor(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as {
      createdAt?: string;
      id?: string;
    };
    return parsed.createdAt && parsed.id
      ? { createdAt: parsed.createdAt, id: parsed.id }
      : null;
  } catch {
    throw new HttpError(400, "The pagination cursor is invalid.");
  }
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function iso(value: Date | string) {
  return new Date(value).toISOString();
}
