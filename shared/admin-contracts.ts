import { z } from "zod";

export const PROFILE_ROLES = ["owner", "sales", "editor"] as const;
export const ProfileRoleSchema = z.enum(PROFILE_ROLES);
export type ProfileRole = z.infer<typeof ProfileRoleSchema>;

export const AdminProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  email: z.string().email().nullable(),
  color: z.string(),
  roles: z.array(ProfileRoleSchema),
  active: z.boolean(),
  createdAt: z.string(),
  lastSeenAt: z.string().nullable(),
});
export type AdminProfile = z.infer<typeof AdminProfileSchema>;

export const ProfileCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  pin: z.string().regex(/^\d{4}$/, "Use a four-digit PIN."),
});

export const ProfileUnlockSchema = z.object({
  profileId: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/),
});

export const ProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
    roles: z.array(ProfileRoleSchema).min(1).optional(),
    active: z.boolean().optional(),
    pin: z
      .string()
      .regex(/^\d{4}$/)
      .optional(),
  })
  .strict();

export const LEAD_STAGE_CATEGORIES = [
  "open",
  "won",
  "lost",
  "archived",
] as const;
export const LeadStageCategorySchema = z.enum(LEAD_STAGE_CATEGORIES);
export type LeadStageCategory = z.infer<typeof LeadStageCategorySchema>;

export const LEAD_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const LeadPrioritySchema = z.enum(LEAD_PRIORITIES);
export type LeadPriority = z.infer<typeof LeadPrioritySchema>;

export const LeadStageSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: LeadStageCategorySchema,
  color: z.string(),
  position: z.number().int(),
  active: z.boolean(),
});
export type LeadStage = z.infer<typeof LeadStageSchema>;

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  country: z.string().nullable(),
  website: z.string().nullable(),
  customFields: z.record(z.unknown()),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const ContactSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid().nullable(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  country: z.string().nullable(),
  customFields: z.record(z.unknown()),
});
export type Contact = z.infer<typeof ContactSchema>;

export const LeadSchema = z.object({
  id: z.string().uuid(),
  legacyId: z.string().nullable(),
  organization: OrganizationSchema,
  contact: ContactSchema,
  stage: LeadStageSchema,
  owner: AdminProfileSchema.nullable(),
  title: z.string(),
  summary: z.string(),
  message: z.string(),
  source: z.string(),
  sourcePage: z.string(),
  formType: z.string(),
  packageCode: z.string().nullable(),
  travelDates: z.string().nullable(),
  pax: z.string().nullable(),
  travelType: z.string().nullable(),
  priority: LeadPrioritySchema,
  duplicate: z.boolean(),
  tags: z.array(z.string()),
  customFields: z.record(z.unknown()),
  firstRespondedAt: z.string().nullable(),
  nextActionAt: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type Lead = z.infer<typeof LeadSchema>;

export const LeadPatchSchema = z
  .object({
    version: z.number().int().positive(),
    stageId: z.string().uuid().optional(),
    ownerId: z.string().uuid().nullable().optional(),
    priority: LeadPrioritySchema.optional(),
    nextActionAt: z.string().datetime().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(48)).max(20).optional(),
    customFields: z.record(z.unknown()).optional(),
    contactCustomFields: z.record(z.unknown()).optional(),
    organizationCustomFields: z.record(z.unknown()).optional(),
  })
  .strict();

export const TASK_STATUSES = ["open", "completed", "cancelled"] as const;
export const TaskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid().nullable(),
  assigneeId: z.string().uuid().nullable(),
  title: z.string(),
  notes: z.string(),
  dueAt: z.string(),
  status: TaskStatusSchema,
  completedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;

export const LeadEventSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  profileId: z.string().uuid().nullable(),
  profileName: z.string().nullable(),
  type: z.string(),
  body: z.string(),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
});
export type LeadEvent = z.infer<typeof LeadEventSchema>;

export const EMAIL_STATUSES = [
  "draft",
  "queued",
  "sent",
  "delivered",
  "bounced",
  "failed",
] as const;
export const EmailStatusSchema = z.enum(EMAIL_STATUSES);
export type EmailStatus = z.infer<typeof EmailStatusSchema>;

export const EmailMessageSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  profileId: z.string().uuid(),
  toEmail: z.string().email(),
  subject: z.string(),
  body: z.string(),
  status: EmailStatusSchema,
  providerMessageId: z.string().nullable(),
  sentAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.string(),
});
export type EmailMessage = z.infer<typeof EmailMessageSchema>;

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string().nullable(),
  readAt: z.string().nullable(),
  dismissedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminNotification = z.infer<typeof NotificationSchema>;

export const CONTENT_KINDS = [
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
] as const;
export const ContentKindSchema = z.enum(CONTENT_KINDS);
export type ContentKind = z.infer<typeof ContentKindSchema>;

export const ContentEntrySchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  kind: ContentKindSchema,
  title: z.string(),
  route: z.string().nullable(),
  draft: z.record(z.unknown()),
  published: z.record(z.unknown()).nullable(),
  draftVersion: z.number().int().positive(),
  publishedVersion: z.number().int().nullable(),
  validationErrors: z.array(z.string()),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
});
export type ContentEntry = z.infer<typeof ContentEntrySchema>;

export const CONTENT_RELEASE_STATUSES = [
  "draft",
  "queued",
  "deploying",
  "live",
  "failed",
] as const;
export const ContentReleaseStatusSchema = z.enum(CONTENT_RELEASE_STATUSES);
export type ContentReleaseStatus = z.infer<typeof ContentReleaseStatusSchema>;

export const ContentReleaseSchema = z.object({
  id: z.string().uuid(),
  number: z.number().int().positive(),
  status: ContentReleaseStatusSchema,
  profileId: z.string().uuid(),
  note: z.string(),
  deployJobId: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.string(),
  liveAt: z.string().nullable(),
});
export type ContentRelease = z.infer<typeof ContentReleaseSchema>;

export const MEDIA_STATUSES = [
  "processing",
  "ready",
  "failed",
  "trashed",
] as const;
export const MediaStatusSchema = z.enum(MEDIA_STATUSES);
export type MediaStatus = z.infer<typeof MediaStatusSchema>;

export const MediaAssetSchema = z.object({
  id: z.string().uuid(),
  pathname: z.string(),
  url: z.string().url(),
  filename: z.string(),
  mimeType: z.string(),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  alt: z.string(),
  focalX: z.number().min(0).max(1),
  focalY: z.number().min(0).max(1),
  status: MediaStatusSchema,
  variants: z.record(z.string()),
  usageCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

export const SavedViewSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  name: z.string(),
  entity: z.literal("leads"),
  filters: z.record(z.unknown()),
  columns: z.array(z.string()),
  sort: z.string(),
});
export type SavedView = z.infer<typeof SavedViewSchema>;

const TimeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time such as 09:00.");

export const WorkspaceSettingSchema = z.object({
  timezone: z.string().trim().min(1).max(80),
  firstResponseSlaHours: z.number().int().min(1).max(72),
  followUpBusinessDays: z.number().int().min(1).max(30).default(1),
  followUpTime: TimeSchema.default("09:00"),
  businessHours: z.object({
    start: TimeSchema,
    end: TimeSchema,
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  }),
});
export type WorkspaceSetting = z.infer<typeof WorkspaceSettingSchema>;

export const AssignmentRuleSchema = z.object({
  field: z.enum(["country", "packageCode", "formType"]),
  value: z.string().trim().min(1).max(160),
  profileId: z.string().uuid(),
});
export type AssignmentRule = z.infer<typeof AssignmentRuleSchema>;

export const RetentionSettingSchema = z.object({
  automaticDeletion: z.boolean(),
  trashDays: z.number().int().min(1).max(365),
});

export const InquiryInputSchema = z
  .object({
    agency: z.string().trim().min(1).max(160),
    contact: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(80).optional().default(""),
    country: z.string().trim().max(120).optional().default(""),
    packageCode: z.string().trim().max(120).optional().default(""),
    travelDates: z.string().trim().max(240).optional().default(""),
    pax: z.string().trim().max(80).optional().default(""),
    groupType: z.string().trim().max(120).optional().default(""),
    message: z.string().trim().min(1).max(12_000),
    consent: z.literal("yes"),
    consentVersion: z.string().trim().max(40).optional().default("2026-07"),
    sourcePage: z.string().trim().max(500).optional().default(""),
    botField: z.string().max(200).optional().default(""),
    company_website: z.string().max(200).optional().default(""),
    utmSource: z.string().trim().max(160).optional().default(""),
    utmMedium: z.string().trim().max(160).optional().default(""),
    utmCampaign: z.string().trim().max(160).optional().default(""),
  })
  .strict();
export type InquiryInput = z.infer<typeof InquiryInputSchema>;

export interface AdminSession {
  authenticated: boolean;
  gatewayAuthenticated: boolean;
  configured: boolean;
  databaseConfigured: boolean;
  adminV2Enabled?: boolean;
  profile: AdminProfile | null;
  csrfToken?: string;
  expiresAt?: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export interface AdminDashboard {
  counts: {
    newLeads: number;
    unassignedLeads: number;
    overdueTasks: number;
    unreadNotifications: number;
    unreadMentions: number;
    slaBreaches: number;
    failedEmails: number;
    draftContent: number;
  };
  recentLeads: Lead[];
  upcomingTasks: Task[];
  recentActivity: LeadEvent[];
  latestRelease: ContentRelease | null;
}

export interface LeadAnalytics {
  totals: {
    leads: number;
    won: number;
    conversionRate: number;
    medianFirstResponseMinutes: number | null;
    slaPercent: number | null;
    firstResponseSlaHours: number;
  };
  byStage: Array<{ label: string; value: number; color: string }>;
  bySource: Array<{ label: string; value: number }>;
  byOwner: Array<{ label: string; value: number }>;
  byMarket: Array<{ label: string; value: number }>;
  byPackage: Array<{ label: string; value: number }>;
  byTravelType: Array<{ label: string; value: number }>;
  trend: Array<{ date: string; value: number }>;
}

export const DEFAULT_PIPELINE_STAGES = [
  { name: "New", category: "open", color: "#C83270", position: 0 },
  { name: "In progress", category: "open", color: "#315D70", position: 1 },
  {
    name: "Waiting on client",
    category: "open",
    color: "#B7791F",
    position: 2,
  },
  { name: "Qualified", category: "open", color: "#246B62", position: 3 },
  { name: "Won", category: "won", color: "#2F855A", position: 4 },
  { name: "Lost", category: "lost", color: "#9B4A4A", position: 5 },
  { name: "Archived", category: "archived", color: "#6B7280", position: 6 },
] as const;
