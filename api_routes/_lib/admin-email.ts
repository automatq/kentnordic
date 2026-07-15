import crypto from "node:crypto";

import { ServerClient } from "postmark";

import type {
  AdminProfile,
  EmailMessage,
} from "../../shared/admin-contracts.js";
import { audit } from "./admin-auth.js";
import { withDatabase } from "./database.js";
import { HttpError } from "./http.js";

interface MessageRow extends Record<string, unknown> {
  id: string;
  lead_id: string;
  profile_id: string;
  to_email: string;
  subject: string;
  body: string;
  status: EmailMessage["status"];
  provider_message_id: string | null;
  sent_at: Date | string | null;
  delivered_at: Date | string | null;
  failure_reason: string | null;
  created_at: Date | string;
}

export function emailConfiguration() {
  return {
    enabled: process.env.ADMIN_EMAIL_ENABLED === "true",
    configured: Boolean(
      process.env.POSTMARK_SERVER_TOKEN &&
      process.env.POSTMARK_FROM_EMAIL &&
      process.env.SALES_REPLY_TO_EMAIL,
    ),
    fromEmail: process.env.POSTMARK_FROM_EMAIL || "",
    replyToEmail: process.env.SALES_REPLY_TO_EMAIL || "",
  };
}

export async function listEmailTemplates() {
  return withDatabase((database) =>
    database.query<{
      id: string;
      name: string;
      subject: string;
      body: string;
    }>(
      `SELECT id, name, subject, body FROM email_templates
       WHERE active = true ORDER BY lower(name)`,
    ),
  );
}

export async function sendLeadEmail(
  actor: AdminProfile,
  leadId: string,
  input: { subject: string; body: string; retryOf?: string },
): Promise<EmailMessage> {
  const configuration = emailConfiguration();
  if (!configuration.enabled) {
    throw new HttpError(
      503,
      "Tracked email is disabled until the sender domain is ready.",
    );
  }
  if (!configuration.configured) {
    throw new HttpError(
      503,
      "Configure Postmark, a verified From address, and the sales reply-to mailbox first.",
    );
  }

  const leads = await withDatabase((database) =>
    database.query<{ email: string; contact_name: string; agency: string }>(
      `SELECT c.email, c.name AS contact_name, o.name AS agency
       FROM leads l JOIN contacts c ON c.id = l.contact_id
       JOIN organizations o ON o.id = l.organization_id
       WHERE l.id = $1 AND l.deleted_at IS NULL`,
      [leadId],
    ),
  );
  const lead = leads[0];
  if (!lead) throw new HttpError(404, "Lead not found.");

  const id = crypto.randomUUID();
  await withDatabase((database) =>
    database.query(
      `INSERT INTO email_messages
        (id, lead_id, profile_id, to_email, subject, body, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'queued')`,
      [
        id,
        leadId,
        actor.id,
        lead.email,
        input.subject.trim(),
        input.body.trim(),
      ],
    ),
  );

  try {
    const client = new ServerClient(process.env.POSTMARK_SERVER_TOKEN!);
    const sent = await client.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL!,
      To: lead.email,
      ReplyTo: process.env.SALES_REPLY_TO_EMAIL!,
      Subject: input.subject.trim(),
      TextBody: input.body.trim(),
      MessageStream: "outbound",
      Metadata: { leadId, emailMessageId: id, profileId: actor.id },
    });
    await withDatabase(
      async (database) => {
        await database.query(
          `UPDATE email_messages SET status = 'sent', provider_message_id = $2,
          sent_at = now(), updated_at = now() WHERE id = $1`,
          [id, sent.MessageID],
        );
        await database.query(
          `UPDATE leads SET first_responded_at = COALESCE(first_responded_at, now()),
          updated_at = now(), version = version + 1 WHERE id = $1`,
          [leadId],
        );
        await database.query(
          `INSERT INTO lead_events (lead_id, profile_id, type, body, metadata)
         VALUES ($1, $2, 'email.sent', $3, $4::jsonb)`,
          [
            leadId,
            actor.id,
            input.subject.trim(),
            JSON.stringify({
              emailMessageId: id,
              to: lead.email,
              retryOf: input.retryOf || null,
            }),
          ],
        );
        await audit(
          database,
          actor.id,
          input.retryOf ? "email.retried" : "email.sent",
          "email",
          id,
          {
            leadId,
            to: lead.email,
            retryOf: input.retryOf || null,
          },
        );
      },
      { transaction: true },
    );
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Postmark rejected the message.";
    await withDatabase(
      async (database) => {
        await database.query(
          `UPDATE email_messages SET status = 'failed', failure_reason = $2, updated_at = now() WHERE id = $1`,
          [id, reason.slice(0, 1_000)],
        );
        await database.query(
          `INSERT INTO notifications (profile_id, type, title, body, href, dedupe_key)
         VALUES ($1, 'email.failed', 'Email failed to send', $2, $3, $4)
         ON CONFLICT (profile_id, dedupe_key) DO NOTHING`,
          [
            actor.id,
            reason.slice(0, 240),
            `/admin/leads/${leadId}`,
            `email-failed:${id}`,
          ],
        );
      },
      { transaction: true },
    );
    throw new HttpError(
      502,
      "The email was saved but could not be sent. Check Settings and retry.",
    );
  }

  const messages = await withDatabase((database) =>
    database.query<MessageRow>(`SELECT * FROM email_messages WHERE id = $1`, [
      id,
    ]),
  );
  return mapMessage(messages[0]!);
}

export async function saveLeadEmailDraft(
  actor: AdminProfile,
  leadId: string,
  input: { subject: string; body: string },
): Promise<EmailMessage> {
  const leads = await withDatabase((database) =>
    database.query<{ email: string }>(
      `SELECT c.email FROM leads l
       JOIN contacts c ON c.id = l.contact_id
       WHERE l.id = $1 AND l.deleted_at IS NULL`,
      [leadId],
    ),
  );
  const lead = leads[0];
  if (!lead) throw new HttpError(404, "Lead not found.");

  const id = crypto.randomUUID();
  await withDatabase(
    async (database) => {
      await database.query(
        `INSERT INTO email_messages
        (id, lead_id, profile_id, to_email, subject, body, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')`,
        [
          id,
          leadId,
          actor.id,
          lead.email,
          input.subject.trim(),
          input.body.trim(),
        ],
      );
      await audit(database, actor.id, "email.draft_saved", "email", id, {
        leadId,
        to: lead.email,
      });
    },
    { transaction: true },
  );

  const messages = await withDatabase((database) =>
    database.query<MessageRow>(`SELECT * FROM email_messages WHERE id = $1`, [
      id,
    ]),
  );
  return mapMessage(messages[0]!);
}

export async function retryLeadEmail(
  actor: AdminProfile,
  leadId: string,
  emailId: string,
): Promise<EmailMessage> {
  const messages = await withDatabase((database) =>
    database.query<Pick<MessageRow, "id" | "subject" | "body" | "status">>(
      `SELECT id, subject, body, status FROM email_messages
       WHERE id = $1 AND lead_id = $2`,
      [emailId, leadId],
    ),
  );
  const message = messages[0];
  if (!message) throw new HttpError(404, "Email attempt not found.");
  if (message.status !== "failed" && message.status !== "bounced") {
    throw new HttpError(400, "Only failed or bounced email can be retried.");
  }
  return sendLeadEmail(actor, leadId, {
    subject: message.subject,
    body: message.body,
    retryOf: message.id,
  });
}

export async function processPostmarkEvent(payload: Record<string, unknown>) {
  const recordType = String(payload.RecordType || "");
  const messageId = String(payload.MessageID || "");
  if (!recordType || !messageId)
    throw new HttpError(400, "Invalid Postmark event.");
  const eventKey = `postmark:${recordType}:${messageId}:${String(payload.ID || payload.DeliveredAt || "event")}`;

  await withDatabase(
    async (database) => {
      const inserted = await database.query<{ key: string }>(
        `INSERT INTO webhook_events (key, provider, payload)
       VALUES ($1, 'postmark', $2::jsonb)
       ON CONFLICT (key) DO NOTHING RETURNING key`,
        [eventKey, JSON.stringify(payload)],
      );
      if (!inserted[0]) return;

      if (recordType === "Delivery") {
        await database.query(
          `UPDATE email_messages SET status = 'delivered', delivered_at = COALESCE($2::timestamptz, now()), updated_at = now()
         WHERE provider_message_id = $1`,
          [messageId, payload.DeliveredAt || null],
        );
        return;
      }
      if (recordType === "Bounce") {
        const reason = String(
          payload.Description || payload.Type || "Delivery bounced.",
        );
        const messages = await database.query<{
          id: string;
          profile_id: string;
          lead_id: string;
        }>(
          `UPDATE email_messages SET status = 'bounced', failure_reason = $2, updated_at = now()
         WHERE provider_message_id = $1 RETURNING id, profile_id, lead_id`,
          [messageId, reason.slice(0, 1_000)],
        );
        const message = messages[0];
        if (message) {
          await database.query(
            `INSERT INTO notifications (profile_id, type, title, body, href, dedupe_key)
           VALUES ($1, 'email.bounced', 'Email bounced', $2, $3, $4)
           ON CONFLICT (profile_id, dedupe_key) DO NOTHING`,
            [
              message.profile_id,
              reason.slice(0, 240),
              `/admin/leads/${message.lead_id}`,
              `email-bounced:${message.id}`,
            ],
          );
        }
      }
    },
    { transaction: true },
  );
}

function mapMessage(row: MessageRow): EmailMessage {
  return {
    id: row.id,
    leadId: row.lead_id,
    profileId: row.profile_id,
    toEmail: row.to_email,
    subject: row.subject,
    body: row.body,
    status: row.status,
    providerMessageId: row.provider_message_id,
    sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
    deliveredAt: row.delivered_at
      ? new Date(row.delivered_at).toISOString()
      : null,
    failureReason: row.failure_reason,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
