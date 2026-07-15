import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  InquiryInputSchema,
  ProfileCreateSchema,
} from "../../shared/admin-contracts.js";
import {
  createProfile,
  getAdminSession,
  loginGateway,
  requireCsrf,
  unlockProfile,
  updateProfile,
} from "./admin-auth.js";
import {
  addLeadEvent,
  createLeadFromInquiry,
  getLeadDetail,
  listLeads,
  listNotifications,
  listPipelineStages,
  listTasks,
  neutralizeCsv,
  nextBusinessDay,
  updateLead,
} from "./admin-crm.js";
import {
  getContentEntry,
  saveContentDraft,
  validateContent,
} from "./admin-content.js";
import { retryLeadEmail, saveLeadEmailDraft } from "./admin-email.js";
import {
  closeLocalDatabase,
  migrateConfiguredDatabase,
  withDatabase,
} from "./database.js";
import type { ApiRequest, ApiResponse } from "./http.js";

const databaseDirectory = path.resolve(
  process.cwd(),
  `.context/test-data/admin-platform-${process.pid}-${Date.now()}`,
);
let owner: Awaited<ReturnType<typeof createProfile>>;
let salesperson: Awaited<ReturnType<typeof createProfile>>;

beforeAll(async () => {
  process.env.ADMIN_PGLITE_DATA_DIR = databaseDirectory;
  process.env.ADMIN_PASSWORD = "workspace-secret";
  process.env.ADMIN_SESSION_SECRET = "test-session-secret-with-enough-entropy";
  delete process.env.DATABASE_URL;
  delete process.env.VERCEL;
  await migrateConfiguredDatabase();
});

afterAll(async () => {
  await closeLocalDatabase();
  await fs.rm(databaseDirectory, { recursive: true, force: true });
});

describe("admin gateway and named profiles", () => {
  it("validates the lightweight profile contract", () => {
    expect(ProfileCreateSchema.parse({ name: "Chris", pin: "1234" })).toEqual({
      name: "Chris",
      pin: "1234",
    });
    expect(() => ProfileCreateSchema.parse({ name: "C", pin: "12" })).toThrow();
  });

  it("durably throttles gateway failures and invalidates a rotated password", async () => {
    const blockedRequest = mockRequest("198.51.100.20");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        loginGateway(blockedRequest, mockResponse().response, "wrong"),
      ).rejects.toMatchObject({ status: 401 });
    }
    await expect(
      loginGateway(blockedRequest, mockResponse().response, "wrong"),
    ).rejects.toMatchObject({ status: 429 });

    const successfulResponse = mockResponse();
    await loginGateway(
      mockRequest("198.51.100.21"),
      successfulResponse.response,
      "workspace-secret",
    );
    const cookie = String(successfulResponse.headers.get("Set-Cookie"));
    const session = await getAdminSession(mockRequest("198.51.100.21", cookie));
    expect(session.gatewayAuthenticated).toBe(true);
    process.env.ADMIN_PASSWORD = "rotated-secret";
    expect(
      (await getAdminSession(mockRequest("198.51.100.21", cookie)))
        .gatewayAuthenticated,
    ).toBe(false);
    process.env.ADMIN_PASSWORD = "workspace-secret";
  });

  it("makes the first profile Owner, later profiles Sales, and guards the last Owner", async () => {
    owner = await createProfile("Owner Person", "1234");
    salesperson = await createProfile("Sales Person", "5678");
    expect(owner.roles).toEqual(["owner"]);
    expect(salesperson.roles).toEqual(["sales"]);

    await expect(
      unlockProfile(
        mockRequest("203.0.113.3"),
        mockResponse().response,
        salesperson.id,
        "0000",
      ),
    ).rejects.toMatchObject({ status: 401 });
    const unlocked = await unlockProfile(
      mockRequest("203.0.113.4"),
      mockResponse().response,
      salesperson.id,
      "5678",
    );
    expect(unlocked.profile.name).toBe("Sales Person");
    expect(() =>
      requireCsrf(
        {
          ...mockRequest("203.0.113.4"),
          method: "PATCH",
          headers: { "x-admin-csrf": "wrong" },
        } as unknown as ApiRequest,
        { csrfToken: unlocked.csrfToken } as never,
      ),
    ).toThrow();

    await updateProfile(owner, salesperson.id, { roles: ["sales", "editor"] });
    await expect(
      updateProfile(owner, owner.id, { roles: ["sales"] }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("public intake and CRM", () => {
  const inquiry = InquiryInputSchema.parse({
    agency: "Nordic Adventures",
    contact: "Alex Example",
    email: "alex@example.test",
    phone: "+354 555 0101",
    country: "Canada",
    packageCode: "IDC-07",
    travelDates: "October 2026",
    pax: "18",
    groupType: "group",
    message: "We need a seven-day winter itinerary.",
    consent: "yes",
    sourcePage: "https://example.test/contact",
    utmSource: "partner",
  });

  it("creates a normalized lead, task, timeline, and idempotent response", async () => {
    const first = await createLeadFromInquiry({
      input: inquiry,
      idempotencyKey: "intake-test-1",
      ipHash: "ip-hash",
      referer: "",
      userAgent: "vitest",
    });
    const repeated = await createLeadFromInquiry({
      input: inquiry,
      idempotencyKey: "intake-test-1",
      ipHash: "ip-hash",
      referer: "",
      userAgent: "vitest",
    });
    expect(repeated.id).toBe(first.id);

    const detail = await getLeadDetail(String(first.id));
    expect(detail?.lead.organization.name).toBe("Nordic Adventures");
    expect(detail?.lead.contact.email).toBe("alex@example.test");
    expect(detail?.events[0]?.type).toBe("lead.created");
    expect(detail?.tasks).toHaveLength(1);

    const duplicate = await createLeadFromInquiry({
      input: inquiry,
      idempotencyKey: "intake-test-2",
      ipHash: "another-hash",
      referer: "",
      userAgent: "vitest",
    });
    expect(duplicate.duplicate).toBe(true);
  });

  it("supports full-text search, cursor records, optimistic locking, assignments, and mentions", async () => {
    const result = await listLeads({ query: "winter itinerary", limit: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeTruthy();
    const lead = result.items[0]!;
    const stages = await listPipelineStages();
    const inProgress = stages.find((stage) => stage.name === "In progress")!;
    const updated = await updateLead(owner, lead.id, {
      version: lead.version,
      stageId: inProgress.id,
      ownerId: salesperson.id,
      tags: ["winter", "group"],
    });
    expect(updated.stage.name).toBe("In progress");
    expect(updated.tags).toEqual(["group", "winter"]);
    await expect(
      updateLead(owner, lead.id, { version: lead.version, priority: "high" }),
    ).rejects.toMatchObject({ status: 409 });

    await addLeadEvent(
      owner,
      lead.id,
      "note",
      "@Sales Person please own the next response.",
    );
    await addLeadEvent(
      owner,
      lead.id,
      "note",
      "@Sales Person please own the next response.",
    );
    const mentionNotifications = (
      await listNotifications(salesperson.id, true)
    ).filter((item) => item.type === "mention");
    expect(mentionNotifications).toHaveLength(1);
    expect(
      (await listTasks({ profileId: salesperson.id })).length,
    ).toBeGreaterThanOrEqual(0);
  });

  it("saves email drafts while sending is disabled and limits retry to failed attempts", async () => {
    const result = await listLeads({ query: "winter itinerary", limit: 1 });
    const lead = result.items[0]!;
    const draft = await saveLeadEmailDraft(owner, lead.id, {
      subject: "A thoughtful follow-up",
      body: "This remains available even before Postmark is enabled.",
    });
    expect(draft.status).toBe("draft");
    expect(
      (await getLeadDetail(lead.id))?.emails.some(
        (email) => email.id === draft.id,
      ),
    ).toBe(true);
    await expect(
      retryLeadEmail(owner, lead.id, draft.id),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("neutralizes spreadsheet formulas and calculates next business days", () => {
    expect(neutralizeCsv('=HYPERLINK("bad")')).toBe('\'=HYPERLINK("bad")');
    expect(neutralizeCsv("ordinary")).toBe("ordinary");
    expect(nextBusinessDay(new Date("2026-07-17T15:00:00Z"))).toBe(
      "2026-07-20T09:00:00.000Z",
    );
  });
});

describe("content revisions", () => {
  it("reports health issues and rejects stale autosaves without overwriting", async () => {
    expect(validateContent({ hero: { url: "not a url", alt: "" } })).toEqual(
      expect.arrayContaining([
        "hero.url is not a valid URL or site path.",
        "hero.alt needs useful alternative text.",
      ]),
    );
    const entryId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    await withDatabase(
      async (database) => {
        await database.query(
          `INSERT INTO content_entries (id, key, kind, title) VALUES ($1, 'site:test', 'site', 'Test content')`,
          [entryId],
        );
        await database.query(
          `INSERT INTO content_revisions (id, entry_id, version, data, validation_errors, note) VALUES ($1, $2, 1, '{"heading":"Original"}'::jsonb, '[]'::jsonb, 'Test seed')`,
          [revisionId, entryId],
        );
        await database.query(
          `UPDATE content_entries SET draft_revision_id = $2, published_revision_id = $2 WHERE id = $1`,
          [entryId, revisionId],
        );
      },
      { transaction: true },
    );

    const saved = await saveContentDraft(owner, entryId, {
      version: 1,
      data: { heading: "New draft" },
      note: "Autosave",
    });
    expect(saved?.entry.draftVersion).toBe(2);
    expect(saved?.entry.publishedVersion).toBe(1);
    await expect(
      saveContentDraft(owner, entryId, {
        version: 1,
        data: { heading: "Stale edit" },
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await getContentEntry(entryId))?.entry.draft.heading).toBe(
      "New draft",
    );
  });
});

function mockRequest(ip: string, cookie = ""): ApiRequest {
  return {
    method: "GET",
    headers: { cookie },
    socket: { remoteAddress: ip },
  } as unknown as ApiRequest;
}

function mockResponse() {
  const headers = new Map<string, unknown>();
  const response = {
    status(_code: number) {
      return undefined as unknown as ApiResponse;
    },
    setHeader(name: string, value: unknown) {
      headers.set(name, value);
      return undefined as unknown as ApiResponse;
    },
    send() {},
    end() {},
  } as unknown as ApiResponse;
  return { response, headers };
}
