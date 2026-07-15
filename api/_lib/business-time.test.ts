import { describe, expect, it } from "vitest";

import {
  businessMinutesBetween,
  nextBusinessDay,
  workspaceSchedule,
} from "./business-time";

describe("business time", () => {
  it("counts only configured weekday windows", () => {
    expect(
      businessMinutesBetween(
        "2026-07-17T16:00:00.000Z",
        "2026-07-20T10:00:00.000Z",
      ),
    ).toBe(120);
    expect(
      businessMinutesBetween(
        "2026-07-18T10:00:00.000Z",
        "2026-07-20T10:00:00.000Z",
      ),
    ).toBe(60);
  });

  it("creates follow-ups in the workspace timezone", () => {
    expect(nextBusinessDay("2026-07-17T16:00:00.000Z")).toBe(
      "2026-07-20T09:00:00.000Z",
    );
    expect(
      nextBusinessDay("2026-07-17T20:00:00.000Z", {
        timezone: "America/Toronto",
        firstResponseSlaHours: 4,
        followUpBusinessDays: 1,
        followUpTime: "09:00",
        businessHours: {
          start: "09:00",
          end: "17:00",
          weekdays: [1, 2, 3, 4, 5],
        },
      }),
    ).toBe("2026-07-20T13:00:00.000Z");
  });

  it("normalizes legacy and malformed workspace settings", () => {
    expect(
      workspaceSchedule({
        timezone: "Europe/Reykjavik",
        firstResponseSlaHours: 8,
      }),
    ).toMatchObject({
      firstResponseSlaHours: 8,
      followUpBusinessDays: 1,
      followUpTime: "09:00",
      businessHours: { weekdays: [1, 2, 3, 4, 5] },
    });
  });
});
