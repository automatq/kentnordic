import { ServerClient } from "postmark";

import { businessMinutesBetween, workspaceSchedule } from "./business-time.js";
import { withDatabase } from "./database.js";
import { emailConfiguration } from "./admin-email.js";

export async function runNotificationJobs() {
  const created = await withDatabase(
    async (database) => {
      const taskRows = await database.query<{ count: number }>(
        `WITH inserted AS (
        INSERT INTO notifications (profile_id, type, title, body, href, dedupe_key)
        SELECT t.assignee_id, 'task.overdue', 'A task is overdue', t.title,
          COALESCE('/admin/leads/' || t.lead_id::text, '/admin/work'),
          'task-overdue:' || t.id::text || ':' || to_char(now(), 'YYYY-MM-DD')
        FROM tasks t JOIN admin_profiles p ON p.id = t.assignee_id
        WHERE t.status = 'open' AND t.due_at < now() AND p.active = true
        ON CONFLICT (profile_id, dedupe_key) DO NOTHING RETURNING id
      ) SELECT count(*)::int AS count FROM inserted`,
      );
      const workspaceRows = await database.query<{ value: unknown }>(
        `SELECT value FROM app_settings WHERE key = 'workspace'`,
      );
      const openLeads = await database.query<{
        id: string;
        owner_id: string | null;
        title: string;
        created_at: Date | string;
      }>(
        `SELECT l.id, l.owner_id, l.title, l.created_at
         FROM leads l JOIN pipeline_stages s ON s.id = l.stage_id
         WHERE l.deleted_at IS NULL AND l.first_responded_at IS NULL AND s.category = 'open'`,
      );
      const profiles = await database.query<{ id: string }>(
        `SELECT p.id FROM admin_profiles p
         WHERE p.active = true AND EXISTS (
           SELECT 1 FROM admin_profile_roles r
           WHERE r.profile_id = p.id AND r.role IN ('sales', 'owner')
         )`,
      );
      const schedule = workspaceSchedule(workspaceRows[0]?.value);
      const eligibleProfiles = new Set(profiles.map((profile) => profile.id));
      let slaCount = 0;
      for (const lead of openLeads) {
        if (
          businessMinutesBetween(lead.created_at, new Date(), schedule) <
          schedule.firstResponseSlaHours * 60
        )
          continue;
        const recipients =
          lead.owner_id && eligibleProfiles.has(lead.owner_id)
            ? [lead.owner_id]
            : lead.owner_id
              ? []
              : [...eligibleProfiles];
        for (const profileId of recipients) {
          const inserted = await database.query<{ id: string }>(
            `INSERT INTO notifications (profile_id, type, title, body, href, dedupe_key)
           VALUES ($1, 'lead.sla_breach', 'First-response SLA breached', $2, $3, $4)
           ON CONFLICT (profile_id, dedupe_key) DO NOTHING RETURNING id`,
            [
              profileId,
              lead.title,
              `/admin/leads/${lead.id}`,
              `sla-breach:${lead.id}`,
            ],
          );
          slaCount += inserted.length;
        }
      }
      await database.query(
        `DELETE FROM idempotency_keys WHERE expires_at < now()`,
      );
      await database.query(
        `DELETE FROM admin_auth_attempts WHERE window_started_at < now() - interval '24 hours' AND locked_until IS NULL`,
      );
      await database.query(
        `UPDATE leads SET ip_hash = NULL, ip_hash_expires_at = NULL WHERE ip_hash_expires_at < now()`,
      );
      return (taskRows[0]?.count || 0) + slaCount;
    },
    { transaction: true },
  );

  const configuration = emailConfiguration();
  let emails = 0;
  if (configuration.enabled && configuration.configured) {
    emails += await sendImmediateEscalations();
    emails += await sendDailyDigests();
  }
  return { notificationsCreated: created, emailsSent: emails };
}

async function sendImmediateEscalations() {
  const rows = await withDatabase((database) =>
    database.query<{
      id: string;
      title: string;
      body: string;
      href: string | null;
      email: string;
      name: string;
    }>(
      `SELECT n.id, n.title, n.body, n.href, p.email, p.name
     FROM notifications n JOIN admin_profiles p ON p.id = n.profile_id
     JOIN notification_preferences pref ON pref.profile_id = p.id
     WHERE pref.email_immediate = true AND p.email IS NOT NULL
       AND n.type IN ('lead.sla_breach', 'email.failed', 'email.bounced', 'content.publish_failed', 'media.failed')
       AND NOT EXISTS (SELECT 1 FROM idempotency_keys i WHERE i.key = 'notification-email:' || n.id::text)
     ORDER BY n.created_at LIMIT 100`,
    ),
  );
  const client = new ServerClient(process.env.POSTMARK_SERVER_TOKEN!);
  let sent = 0;
  for (const row of rows) {
    await client.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL!,
      To: row.email,
      ReplyTo: process.env.SALES_REPLY_TO_EMAIL!,
      Subject: `[Idcibidci admin] ${row.title}`,
      TextBody: `Hi ${row.name},\n\n${row.body}\n\nOpen: ${process.env.PUBLIC_SITE_ORIGIN || "https://idcibidci.is"}${row.href || "/admin"}`,
      MessageStream: "outbound",
    });
    await withDatabase((database) =>
      database.query(
        `INSERT INTO idempotency_keys (key, scope, response, expires_at)
       VALUES ($1, 'notification-email', '{"sent":true}'::jsonb, now() + interval '90 days') ON CONFLICT DO NOTHING`,
        [`notification-email:${row.id}`],
      ),
    );
    sent += 1;
  }
  return sent;
}

async function sendDailyDigests() {
  const hour = new Date().getUTCHours();
  if (hour !== 9) return 0;
  const date = new Date().toISOString().slice(0, 10);
  const profiles = await withDatabase((database) =>
    database.query<{ id: string; name: string; email: string }>(
      `SELECT p.id, p.name, p.email FROM admin_profiles p
     JOIN notification_preferences pref ON pref.profile_id = p.id
     WHERE p.active = true AND p.email IS NOT NULL AND pref.email_digest = true
       AND NOT EXISTS (SELECT 1 FROM idempotency_keys i WHERE i.key = 'daily-digest:' || p.id::text || ':' || $1)`,
      [date],
    ),
  );
  const client = new ServerClient(process.env.POSTMARK_SERVER_TOKEN!);
  for (const profile of profiles) {
    const summary = await withDatabase((database) =>
      database.query<{ overdue: number; today: number; unread: number }>(
        `SELECT
        (SELECT count(*)::int FROM tasks WHERE assignee_id = $1 AND status = 'open' AND due_at < date_trunc('day', now())) AS overdue,
        (SELECT count(*)::int FROM tasks WHERE assignee_id = $1 AND status = 'open' AND due_at >= date_trunc('day', now()) AND due_at < date_trunc('day', now()) + interval '1 day') AS today,
        (SELECT count(*)::int FROM notifications WHERE profile_id = $1 AND read_at IS NULL AND dismissed_at IS NULL) AS unread`,
        [profile.id],
      ),
    );
    const item = summary[0] || { overdue: 0, today: 0, unread: 0 };
    await client.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL!,
      To: profile.email,
      ReplyTo: process.env.SALES_REPLY_TO_EMAIL!,
      Subject: `Your Idcibidci admin digest — ${date}`,
      TextBody: `Hi ${profile.name},\n\nOverdue tasks: ${item.overdue}\nDue today: ${item.today}\nUnread notifications: ${item.unread}\n\nOpen the console: ${process.env.PUBLIC_SITE_ORIGIN || "https://idcibidci.is"}/admin/work`,
      MessageStream: "outbound",
    });
    await withDatabase((database) =>
      database.query(
        `INSERT INTO idempotency_keys (key, scope, response, expires_at)
       VALUES ($1, 'daily-digest', '{"sent":true}'::jsonb, now() + interval '90 days') ON CONFLICT DO NOTHING`,
        [`daily-digest:${profile.id}:${date}`],
      ),
    );
  }
  return profiles.length;
}
