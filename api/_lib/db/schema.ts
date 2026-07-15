import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true })
  .defaultNow()
  .notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull();

export const profileRoleEnum = pgEnum("profile_role", [
  "owner",
  "sales",
  "editor",
]);
export const stageCategoryEnum = pgEnum("stage_category", [
  "open",
  "won",
  "lost",
  "archived",
]);
export const leadPriorityEnum = pgEnum("lead_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "completed",
  "cancelled",
]);
export const emailStatusEnum = pgEnum("email_status", [
  "draft",
  "queued",
  "sent",
  "delivered",
  "bounced",
  "failed",
]);
export const contentKindEnum = pgEnum("content_kind", [
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
]);
export const releaseStatusEnum = pgEnum("release_status", [
  "draft",
  "queued",
  "deploying",
  "live",
  "failed",
]);
export const mediaStatusEnum = pgEnum("media_status", [
  "processing",
  "ready",
  "failed",
  "trashed",
]);

export const profiles = pgTable(
  "admin_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    email: text("email"),
    color: text("color").notNull().default("#315D70"),
    pinSalt: text("pin_salt").notNull(),
    pinHash: text("pin_hash").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt,
    updatedAt,
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("admin_profiles_name_unique").on(table.normalizedName),
  ],
);

export const profileRoles = pgTable(
  "admin_profile_roles",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: profileRoleEnum("role").notNull(),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.role] })],
);

export const profileSessions = pgTable(
  "admin_profile_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    passwordVersion: text("password_version").notNull(),
    csrfToken: text("csrf_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt,
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("admin_sessions_profile_idx").on(table.profileId),
    index("admin_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const authAttempts = pgTable("admin_auth_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    country: text("country"),
    website: text("website"),
    customFields: jsonb("custom_fields")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt,
    updatedAt,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("organizations_name_unique").on(table.normalizedName),
    index("organizations_deleted_idx").on(table.deletedAt),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    phone: text("phone"),
    country: text("country"),
    customFields: jsonb("custom_fields")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt,
    updatedAt,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("contacts_email_unique").on(table.normalizedEmail),
    index("contacts_org_idx").on(table.organizationId),
  ],
);

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: stageCategoryEnum("category").notNull(),
    color: text("color").notNull(),
    position: integer("position").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("pipeline_stages_position_unique").on(table.position),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    legacyId: text("legacy_id"),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => pipelineStages.id),
    ownerId: uuid("owner_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    message: text("message").notNull().default(""),
    source: text("source").notNull().default("website"),
    sourcePage: text("source_page").notNull().default(""),
    formType: text("form_type").notNull().default("inquiry"),
    packageCode: text("package_code"),
    travelDates: text("travel_dates"),
    pax: text("pax"),
    travelType: text("travel_type"),
    priority: leadPriorityEnum("priority").notNull().default("normal"),
    duplicate: boolean("duplicate").notNull().default(false),
    consentVersion: text("consent_version").notNull().default("2026-07"),
    utm: jsonb("utm").$type<Record<string, string>>().default({}).notNull(),
    customFields: jsonb("custom_fields")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    firstRespondedAt: timestamp("first_responded_at", { withTimezone: true }),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    ipHash: text("ip_hash"),
    ipHashExpiresAt: timestamp("ip_hash_expires_at", { withTimezone: true }),
    createdAt,
    updatedAt,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("leads_legacy_id_unique").on(table.legacyId),
    index("leads_stage_created_idx").on(table.stageId, table.createdAt),
    index("leads_owner_next_action_idx").on(table.ownerId, table.nextActionAt),
    index("leads_deleted_idx").on(table.deletedAt),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    color: text("color").notNull().default("#6B7280"),
    createdAt,
  },
  (table) => [uniqueIndex("tags_name_unique").on(table.normalizedName)],
);

export const leadTags = pgTable(
  "lead_tags",
  {
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.leadId, table.tagId] })],
);

export const leadEvents = pgTable(
  "lead_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    body: text("body").notNull().default(""),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt,
  },
  (table) => [
    index("lead_events_lead_created_idx").on(table.leadId, table.createdAt),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    assigneeId: uuid("assignee_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    status: taskStatusEnum("status").notNull().default("open"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("tasks_assignee_due_idx").on(
      table.assigneeId,
      table.status,
      table.dueAt,
    ),
  ],
);

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt,
  updatedAt,
});

export const emailMessages = pgTable(
  "email_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: emailStatusEnum("status").notNull().default("draft"),
    providerMessageId: text("provider_message_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("email_provider_message_unique").on(table.providerMessageId),
    index("email_lead_created_idx").on(table.leadId, table.createdAt),
  ],
);

export const webhookEvents = pgTable("webhook_events", {
  key: text("key").primaryKey(),
  provider: text("provider").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt,
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"),
    dedupeKey: text("dedupe_key").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    uniqueIndex("notifications_profile_dedupe_unique").on(
      table.profileId,
      table.dedupeKey,
    ),
    index("notifications_profile_unread_idx").on(table.profileId, table.readAt),
  ],
);

export const notificationPreferences = pgTable("notification_preferences", {
  profileId: uuid("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  browser: boolean("browser").notNull().default(false),
  emailImmediate: boolean("email_immediate").notNull().default(false),
  emailDigest: boolean("email_digest").notNull().default(false),
  updatedAt,
});

export const savedViews = pgTable(
  "saved_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    entity: text("entity").notNull().default("leads"),
    filters: jsonb("filters")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    columns: jsonb("columns").$type<string[]>().default([]).notNull(),
    sort: text("sort").notNull().default("createdAt:desc"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("saved_views_profile_name_unique").on(
      table.profileId,
      table.name,
    ),
  ],
);

export const customFieldDefinitions = pgTable(
  "custom_field_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entity: text("entity").notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: text("type").notNull(),
    options: jsonb("options").$type<string[]>().default([]).notNull(),
    required: boolean("required").notNull().default(false),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("custom_fields_entity_key_unique").on(table.entity, table.key),
  ],
);

export const contentEntries = pgTable(
  "content_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    kind: contentKindEnum("kind").notNull(),
    title: text("title").notNull(),
    route: text("route"),
    draftRevisionId: uuid("draft_revision_id"),
    publishedRevisionId: uuid("published_revision_id"),
    createdAt,
    updatedAt,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("content_entries_key_unique").on(table.key)],
);

export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => contentEntries.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    validationErrors: jsonb("validation_errors")
      .$type<string[]>()
      .default([])
      .notNull(),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    note: text("note").notNull().default(""),
    createdAt,
  },
  (table) => [
    uniqueIndex("content_revisions_entry_version_unique").on(
      table.entryId,
      table.version,
    ),
  ],
);

export const contentReleases = pgTable("content_releases", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: integer("number").notNull(),
  status: releaseStatusEnum("status").notNull().default("draft"),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id),
  note: text("note").notNull().default(""),
  deployJobId: text("deploy_job_id"),
  failureReason: text("failure_reason"),
  createdAt,
  liveAt: timestamp("live_at", { withTimezone: true }),
});

export const contentReleaseEntries = pgTable(
  "content_release_entries",
  {
    releaseId: uuid("release_id")
      .notNull()
      .references(() => contentReleases.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => contentEntries.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => contentRevisions.id),
  },
  (table) => [primaryKey({ columns: [table.releaseId, table.entryId] })],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pathname: text("pathname").notNull(),
    url: text("url").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    alt: text("alt").notNull().default(""),
    focalX: integer("focal_x").notNull().default(50),
    focalY: integer("focal_y").notNull().default(50),
    status: mediaStatusEnum("status").notNull().default("processing"),
    variants: jsonb("variants")
      .$type<Record<string, string>>()
      .default({})
      .notNull(),
    failureReason: text("failure_reason"),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt,
    updatedAt,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("media_assets_path_unique").on(table.pathname),
    index("media_assets_status_idx").on(table.status, table.createdAt),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt,
  },
  (table) => [
    index("audit_entity_created_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
  ],
);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedBy: uuid("updated_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  updatedAt,
});

export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  scope: text("scope").notNull(),
  response: jsonb("response").$type<Record<string, unknown>>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt,
});
