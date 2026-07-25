import { describe, expect, it } from "vitest";

import { formTypeFromSourcePage } from "./form-type.js";

describe("formTypeFromSourcePage", () => {
  it.each([
    ["/contact", "inquiry"],
    ["/#rate-sheet", "rate-sheet"],
    ["/#fare-list-updates", "fare-list-updates"],
  ] as const)("classifies %s as %s", (sourcePage, expected) => {
    expect(formTypeFromSourcePage(sourcePage)).toBe(expected);
  });
});
