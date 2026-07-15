import crypto from "node:crypto";

import type { AdminProfile, SavedView } from "../../shared/admin-contracts.js";
import { audit } from "./admin-auth.js";
import { ensureAdminSeeded } from "./admin-crm.js";
import { withDatabase } from "./database.js";
import { HttpError } from "./http.js";

export async function getAdminSettings(profileId: string) {
  await ensureAdminSeeded();
  const [settings, preferences, customFields] = await Promise.all([
    withDatabase((database) =>
      database.query<{
        key: string;
        value: unknown;
        updated_at: Date | string;
      }>(`SELECT key, value, updated_at FROM app_settings ORDER BY key`),
    ),
    withDatabase((database) =>
      database.query<{
        browser: boolean;
        email_immediate: boolean;
        email_digest: boolean;
      }>(
        `SELECT browser, email_immediate, email_digest
         FROM notification_preferences WHERE profile_id = $1`,
        [profileId],
      ),
    ),
    listCustomFields(),
  ]);
  return {
    values: Object.fromEntries(
      settings.map((setting) => [setting.key, setting.value]),
    ),
    notificationPreferences: {
      browser: preferences[0]?.browser || false,
      emailImmediate: preferences[0]?.email_immediate || false,
      emailDigest: preferences[0]?.email_digest || false,
    },
    customFields,
  };
}

export async function updateSetting(
  actor: AdminProfile,
  key: string,
  value: unknown,
) {
  const allowed = new Set(["workspace", "retention", "assignment_rules"]);
  if (!allowed.has(key))
    throw new HttpError(400, "That setting cannot be changed here.");
  await withDatabase(
    async (database) => {
      await database.query(
        `INSERT INTO app_settings (key, value, updated_by, updated_at)
       VALUES ($1, $2::jsonb, $3, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [key, JSON.stringify(value), actor.id],
      );
      await audit(database, actor.id, "settings.updated", "settings", key);
    },
    { transaction: true },
  );
}

export async function updateNotificationPreferences(
  profileId: string,
  values: {
    browser?: boolean;
    emailImmediate?: boolean;
    emailDigest?: boolean;
  },
) {
  await withDatabase((database) =>
    database.query(
      `INSERT INTO notification_preferences
        (profile_id, browser, email_immediate, email_digest, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (profile_id) DO UPDATE SET
        browser = COALESCE($2, notification_preferences.browser),
        email_immediate = COALESCE($3, notification_preferences.email_immediate),
        email_digest = COALESCE($4, notification_preferences.email_digest),
        updated_at = now()`,
      [
        profileId,
        values.browser ?? null,
        values.emailImmediate ?? null,
        values.emailDigest ?? null,
      ],
    ),
  );
}

export async function savePipeline(
  actor: AdminProfile,
  stages: Array<{
    id: string;
    name: string;
    category: "open" | "won" | "lost" | "archived";
    color: string;
    position: number;
    active: boolean;
  }>,
) {
  if (!stages.some((stage) => stage.active && stage.category === "open")) {
    throw new HttpError(400, "Keep at least one active open stage.");
  }
  await withDatabase(
    async (database) => {
      await database.query(
        `UPDATE pipeline_stages SET position = position + 1000`,
      );
      for (const stage of stages) {
        await database.query(
          `UPDATE pipeline_stages SET name = $2, category = $3, color = $4,
          position = $5, active = $6, updated_at = now() WHERE id = $1`,
          [
            stage.id,
            stage.name.trim(),
            stage.category,
            stage.color,
            stage.position,
            stage.active,
          ],
        );
      }
      await audit(database, actor.id, "pipeline.updated", "pipeline", null, {
        count: stages.length,
      });
    },
    { transaction: true },
  );
}

export async function listSavedViews(profileId: string): Promise<SavedView[]> {
  const rows = await withDatabase((database) =>
    database.query<{
      id: string;
      profile_id: string;
      name: string;
      entity: "leads";
      filters: Record<string, unknown>;
      columns: string[];
      sort: string;
    }>(
      `SELECT id, profile_id, name, entity, filters, columns, sort
       FROM saved_views WHERE profile_id = $1 ORDER BY lower(name)`,
      [profileId],
    ),
  );
  return rows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    entity: row.entity,
    filters: row.filters || {},
    columns: row.columns || [],
    sort: row.sort,
  }));
}

export async function saveView(
  profileId: string,
  input: {
    name: string;
    filters: Record<string, unknown>;
    columns: string[];
    sort: string;
  },
) {
  const id = crypto.randomUUID();
  await withDatabase((database) =>
    database.query(
      `INSERT INTO saved_views (id, profile_id, name, filters, columns, sort)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
       ON CONFLICT (profile_id, name) DO UPDATE SET filters = EXCLUDED.filters,
        columns = EXCLUDED.columns, sort = EXCLUDED.sort, updated_at = now()`,
      [
        id,
        profileId,
        input.name.trim(),
        JSON.stringify(input.filters),
        JSON.stringify(input.columns),
        input.sort,
      ],
    ),
  );
}

export async function deleteView(profileId: string, id: string) {
  await withDatabase((database) =>
    database.query(
      `DELETE FROM saved_views WHERE id = $1 AND profile_id = $2`,
      [id, profileId],
    ),
  );
}

export async function listCustomFields() {
  return withDatabase((database) =>
    database.query<{
      id: string;
      entity: string;
      key: string;
      label: string;
      type: string;
      options: string[];
      required: boolean;
      position: number;
      active: boolean;
    }>(
      `SELECT id, entity, key, label, type, options, required, position, active
       FROM custom_field_definitions ORDER BY entity, position, lower(label)`,
    ),
  );
}

export async function saveCustomField(
  actor: AdminProfile,
  input: {
    id?: string;
    entity: "lead" | "contact" | "organization";
    key: string;
    label: string;
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
    position: number;
    active: boolean;
  },
) {
  const id = input.id || crypto.randomUUID();
  await withDatabase(
    async (database) => {
      await database.query(
        `INSERT INTO custom_field_definitions
        (id, entity, key, label, type, options, required, position, active)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
       ON CONFLICT (entity, key) DO UPDATE SET label = EXCLUDED.label,
        options = EXCLUDED.options, required = EXCLUDED.required,
        position = EXCLUDED.position, active = EXCLUDED.active, updated_at = now()`,
        [
          id,
          input.entity,
          input.key,
          input.label,
          input.type,
          JSON.stringify(input.options),
          input.required,
          input.position,
          input.active,
        ],
      );
      await audit(
        database,
        actor.id,
        "custom_field.saved",
        "custom_field",
        id,
        { entity: input.entity, key: input.key },
      );
    },
    { transaction: true },
  );
}
