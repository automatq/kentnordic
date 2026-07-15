import { describe, expect, it } from "vitest";

import {
  InquiryInputSchema,
  LeadPatchSchema,
  ProfileUpdateSchema,
} from "./admin-contracts";

describe("shared admin contracts", () => {
  it("rejects unknown intake fields and malformed emails", () => {
    const result = InquiryInputSchema.safeParse({
      agency: "Agency",
      contact: "Name",
      email: "bad",
      message: "Hello",
      consent: "yes",
      unexpected: true,
    });
    expect(result.success).toBe(false);
  });

  it("requires record versions for lead mutations", () => {
    expect(
      LeadPatchSchema.safeParse({
        stageId: "85dd6a0f-c0e0-4ee3-a455-c35c1bf08cb4",
      }).success,
    ).toBe(false);
    expect(
      LeadPatchSchema.safeParse({ version: 1, priority: "urgent" }).success,
    ).toBe(true);
  });

  it("keeps profile administration strict", () => {
    expect(
      ProfileUpdateSchema.safeParse({ roles: ["owner", "editor"] }).success,
    ).toBe(true);
    expect(
      ProfileUpdateSchema.safeParse({ roles: [], hidden: true }).success,
    ).toBe(false);
  });
});
