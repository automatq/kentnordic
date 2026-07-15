import { readFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const owner = { name: "Playwright Owner", pin: "2468" };
const sales = { name: "Playwright Sales", pin: "1357" };

test.describe.serial("unified admin console", () => {
  test("unlocks through the shared gateway, creates a named Owner, and is keyboard accessible", async ({
    page,
  }) => {
    await unlockAs(page, owner);

    await expect(
      page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Admin navigation" }),
    ).toContainText("Leads");
    await expect(
      page.getByRole("navigation", { name: "Admin navigation" }),
    ).toContainText("Content");
    await expect(
      page.getByRole("navigation", { name: "Admin navigation" }),
    ).toContainText("Team");

    await page.keyboard.press("Meta+k");
    await expect(
      page.getByRole("dialog", { name: "Command menu" }),
    ).toBeVisible();
    await page
      .getByPlaceholder("Where would you like to go?")
      .fill("analytics");
    await page.getByRole("button", { name: /Analytics/ }).click();
    await expect(page).toHaveURL(/\/admin\/analytics$/);

    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact || ""),
      ),
    ).toEqual([]);
  });

  test("keeps critical admin actions usable at 320 CSS pixels", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await unlockAs(page, owner);

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("navigation", { name: "Admin navigation" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Leads" }).click();
    await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
  });

  test("enforces Sales navigation and direct-route permissions", async ({
    page,
  }) => {
    await unlockAs(page, owner);
    await page.getByRole("link", { name: "Team" }).click();
    await page.getByRole("button", { name: "Add profile" }).click();
    await page.getByLabel("Name", { exact: true }).fill(sales.name);
    await page.getByLabel("Temporary four-digit PIN").fill(sales.pin);
    await page.getByRole("button", { name: "Create profile" }).click();
    await expect(page.getByText(sales.name, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: `Profile: ${owner.name}` }).click();
    await page.getByRole("button", { name: "Switch profile" }).click();
    await page
      .getByRole("list", { name: "Profiles" })
      .getByText(sales.name, { exact: true })
      .click();
    await page.getByLabel(`${sales.name}’s four-digit PIN`).fill(sales.pin);
    await page.getByRole("button", { name: `Enter as ${sales.name}` }).click();

    await expect(
      page.getByRole("navigation", { name: "Admin navigation" }),
    ).not.toContainText("Content");
    await expect(
      page.getByRole("navigation", { name: "Admin navigation" }),
    ).not.toContainText("Team");
    await page.goto("/admin/content");
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("personalizes reusable email templates and preserves drafts while sending is disabled", async ({
    page,
  }) => {
    await unlockAs(page, owner);
    const intake = await page.request.post("/api/submissions", {
      headers: { "Idempotency-Key": "playwright-email-draft" },
      data: {
        agency: "Aurora Travel",
        contact: "Robin Example",
        email: "robin@example.test",
        phone: "+1 555 0100",
        country: "Canada",
        packageCode: "WINTER-7",
        travelDates: "February 2027",
        pax: "12",
        groupType: "Leisure group",
        message: "We would like a private winter itinerary.",
        consent: "yes",
        sourcePage: "https://example.test/contact",
      },
    });
    expect(intake.ok()).toBe(true);
    await page
      .getByRole("navigation", { name: "Admin navigation" })
      .getByRole("link", { name: "Leads" })
      .click();
    await page.getByRole("link", { name: "Robin Example" }).click();
    await page.getByRole("button", { name: "Send email" }).click();
    await expect(page.getByText(/Email remains safely disabled/)).toBeVisible();
    await page
      .getByLabel("Start from a template")
      .selectOption({ label: "Initial response" });
    await expect(page.getByLabel("Subject")).toHaveValue(
      "Your Iceland request — Aurora Travel",
    );
    await expect(page.getByLabel("Message")).toHaveValue(/Hi Robin Example/);
    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(
      page.getByText("Draft: Your Iceland request — Aurora Travel"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue draft" }).click();
    await expect(
      page.getByRole("dialog", { name: "Continue email draft" }),
    ).toBeVisible();
    await expect(page.getByLabel("Message")).toHaveValue(
      new RegExp(owner.name),
    );
  });
});

async function unlockAs(page: Page, profile: typeof owner) {
  await page.goto("/admin");
  const gateway = page.getByLabel("Shared password");
  await expect(
    gateway
      .or(page.getByRole("heading", { name: "Create your profile" }))
      .or(page.getByRole("heading", { name: "Who’s working?" }))
      .or(page.locator(".admin-shell")),
  ).toBeVisible();
  if (await gateway.isVisible().catch(() => false)) {
    await gateway.fill(adminPassword());
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page
        .getByRole("heading", { name: "Create your profile" })
        .or(page.getByRole("heading", { name: "Who’s working?" }))
        .or(page.locator(".admin-shell")),
    ).toBeVisible();
  }

  if (
    await page
      .getByRole("heading", { name: "Create your profile" })
      .isVisible()
      .catch(() => false)
  ) {
    await page.getByLabel("Your name").fill(profile.name);
    await page.getByLabel("Four-digit PIN").fill(profile.pin);
    await page.getByRole("button", { name: "Create and enter" }).click();
  } else if (
    await page
      .getByRole("heading", { name: "Who’s working?" })
      .isVisible()
      .catch(() => false)
  ) {
    await page
      .getByRole("list", { name: "Profiles" })
      .getByText(profile.name, { exact: true })
      .click();
    await page.getByLabel(`${profile.name}’s four-digit PIN`).fill(profile.pin);
    await page
      .getByRole("button", { name: `Enter as ${profile.name}` })
      .click();
  }
  await expect(page.locator(".admin-shell")).toBeVisible();
}

function adminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const contents = readFileSync(".env.local", "utf8");
  const line = contents
    .split(/\r?\n/)
    .find((value) => /^\s*(?:export\s+)?ADMIN_PASSWORD\s*=/.test(value));
  if (!line)
    throw new Error(
      "Set ADMIN_PASSWORD or add it to .env.local before running admin E2E tests.",
    );
  const value = line
    .replace(/^\s*(?:export\s+)?ADMIN_PASSWORD\s*=\s*/, "")
    .trim();
  return value.replace(
    /^(?:\"([^\"]*)\"|'([^']*)')$/,
    (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted,
  );
}
