import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const base = process.env.BASE ?? "http://127.0.0.1:4173";
const routes = [
  "/",
  "/about",
  "/services",
  "/destinations",
  "/tours",
  "/tours/std02s4",
  "/contact",
  "/privacy",
  "/trade-terms",
  "/admin",
];
const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
];

let failures = 0;

function check(condition, label, detail = "") {
  if (!condition) failures += 1;
  console.log(
    `${condition ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`,
  );
}

async function checkIntro(page) {
  await page.goto(`${base}/?intro`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.locator(".site-intro-skip").waitFor({ state: "visible" });
  await page.waitForFunction(() =>
    document.activeElement?.classList.contains("site-intro-skip"),
  );

  const introState = await page.evaluate(() => {
    const background = [
      document.querySelector(".skip-link"),
      document.querySelector(".site-header"),
      ...document.querySelectorAll("#main > :not(.site-intro)"),
      document.querySelector(".site-footer"),
    ].filter(Boolean);
    return {
      activeLabel: document.activeElement?.textContent?.trim(),
      modal: document.querySelector(".site-intro")?.getAttribute("aria-modal"),
      isolated: background.every(
        (element) =>
          element.inert && element.getAttribute("aria-hidden") === "true",
      ),
    };
  });
  check(
    introState.activeLabel === "Skip intro",
    "intro places initial focus on Skip intro",
    introState.activeLabel,
  );
  check(introState.modal === "true", "intro identifies itself as modal");
  check(introState.isolated, "intro makes covered application content inert");

  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press("Tab");
  }
  check(
    await page.evaluate(
      () => document.activeElement?.closest(".site-intro") !== null,
    ),
    "intro keyboard focus cannot enter covered content",
  );

  await page.locator(".site-intro-skip").click();
  await page.locator(".site-intro").waitFor({ state: "detached" });
  const restored = await page.evaluate(() =>
    [
      document.querySelector(".skip-link"),
      document.querySelector(".site-header"),
      document.querySelector(".site-footer"),
    ]
      .filter(Boolean)
      .every(
        (element) =>
          !element.inert && element.getAttribute("aria-hidden") !== "true",
      ),
  );
  check(restored, "intro restores application accessibility after dismissal");
}

async function checkMarquee(page) {
  await page.goto(`${base}/tours`, { waitUntil: "networkidle" });
  const result = await page.evaluate(() => {
    const accessibleTracks = document.querySelectorAll(
      ".marquee-track:not([aria-hidden='true'])",
    );
    const duplicateTracks = [
      ...document.querySelectorAll(".marquee-track[aria-hidden='true']"),
    ];
    const duplicateLinks = duplicateTracks.flatMap((track) => [
      ...track.querySelectorAll("a, button, input, select, textarea"),
    ]);
    const focusEscaped = duplicateLinks.every((element) => {
      element.focus();
      return document.activeElement !== element;
    });
    return {
      accessibleLinks: accessibleTracks[0]?.querySelectorAll("a").length ?? 0,
      duplicateTracks: duplicateTracks.length,
      inert: duplicateTracks.every((track) => track.inert),
      focusEscaped,
    };
  });
  check(result.accessibleLinks > 0, "one marquee track remains interactive");
  check(result.duplicateTracks > 0, "marquee renders a duplicate visual track");
  check(result.inert, "marquee duplicate tracks are inert");
  check(
    result.focusEscaped,
    "marquee duplicate descendants cannot receive focus",
  );
}

async function loadWalkthrough(page, route) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.locator(".deferred-content").scrollIntoViewIfNeeded();
  await page.locator(".walk-dot").first().waitFor({ state: "visible" });
}

async function checkWalkthrough(page, route, width) {
  await loadWalkthrough(page, route);
  const sizes = await page.locator(".walk-dot").evaluateAll((dots) =>
    dots.map((dot) => {
      const rect = dot.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  );
  check(
    sizes.length > 0 &&
      sizes.every((size) => size.width >= 24 && size.height >= 24),
    `${route} walkthrough dots are at least 24×24px at ${width}px`,
    sizes.map((size) => `${size.width}×${size.height}`).join(", "),
  );

  const controlsFit = await page
    .locator(".walk-controls")
    .evaluate((controls) => ({
      clientWidth: controls.clientWidth,
      scrollWidth: controls.scrollWidth,
    }));
  check(
    controlsFit.scrollWidth <= controlsFit.clientWidth,
    `${route} walkthrough controls do not overflow at ${width}px`,
    `${controlsFit.scrollWidth}/${controlsFit.clientWidth}px`,
  );

  const dots = page.locator(".walk-dot");
  if ((await dots.count()) > 1) {
    await dots.nth(1).click();
    check(
      (await dots.nth(1).getAttribute("aria-current")) === "step",
      `${route} day navigation remains interactive`,
    );
  }
}

async function checkInputsAndHeadings(page) {
  await page.goto(`${base}/about`, { waitUntil: "networkidle" });
  const footerSize = Number.parseFloat(
    await page
      .locator(".rate-sheet-row input")
      .evaluate((input) => getComputedStyle(input).fontSize),
  );
  check(
    footerSize >= 16,
    "footer email input uses mobile-safe text sizing",
    `${footerSize}px`,
  );

  await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
  const adminSize = Number.parseFloat(
    await page
      .locator('input[type="password"]')
      .evaluate((input) => getComputedStyle(input).fontSize),
  );
  check(
    adminSize >= 16,
    "Admin password input uses mobile-safe text sizing",
    `${adminSize}px`,
  );

  for (const [route, expected] of [
    ["/privacy", "Privacy Policy"],
    ["/trade-terms", "Trade Terms"],
  ]) {
    await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    const headings = await page.locator("h1").allTextContents();
    check(
      headings.length === 1 && headings[0].trim() === expected,
      `${route} has one visible level-one title`,
      headings.join(" | "),
    );
  }
}

async function checkInteractions(page) {
  await page.goto(`${base}/destinations`, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "South Coast - 6 tour packages" })
    .focus();
  await page.keyboard.press("Enter");
  check(
    await page
      .locator("#hot-south-coast")
      .evaluate((region) => region.classList.contains("is-active")),
    "destination map selection remains interactive",
  );

  await page.goto(`${base}/tours`, { waitUntil: "networkidle" });
  await page.locator('[data-filter="length"] [data-value="short"]').click();
  check(
    (await page.locator("[data-count]").textContent())?.trim() ===
      "Showing 1 of 6 tours",
    "tour length filter remains interactive",
    (await page.locator("[data-count]").textContent())?.trim(),
  );

  await page.goto(`${base}/contact`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Send inquiry" }).click();
  const invalidFields = await page.locator(":invalid").count();
  check(
    invalidFields > 0,
    "invalid Contact form is blocked by native validation",
  );
}

async function checkRoutes(page, viewport) {
  for (const route of routes) {
    const consoleErrors = [];
    const onConsole = (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    };
    const pageErrors = [];
    const onPageError = (error) => pageErrors.push(error.message);
    page.on("console", onConsole);
    page.on("pageerror", onPageError);

    await page.goto(`${base}${route}`, {
      waitUntil: "networkidle",
      timeout: 45_000,
    });
    if (route === "/tours/std02s4") {
      await page.locator(".deferred-content").scrollIntoViewIfNeeded();
      await page.locator(".walk-dot").first().waitFor({ state: "visible" });
    }

    const visualHealth = await page.evaluate(
      (expectedWidth) => ({
        documentWidth: document.documentElement.scrollWidth,
        brokenImages: [...document.images].filter(
          (image) => image.complete && image.naturalWidth === 0,
        ).length,
        expectedWidth,
      }),
      viewport.width,
    );
    check(
      visualHealth.documentWidth <= viewport.width,
      `${route} has no horizontal overflow at ${viewport.width}px`,
      `${visualHealth.documentWidth}px`,
    );
    check(
      visualHealth.brokenImages === 0,
      `${route} has no broken loaded images at ${viewport.width}px`,
    );

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = axe.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact),
    );
    check(
      blocking.length === 0,
      `${route} has zero serious/critical axe violations at ${viewport.width}px`,
      blocking.map((violation) => violation.id).join(", "),
    );
    check(
      consoleErrors.length === 0 && pageErrors.length === 0,
      `${route} has no console or page errors at ${viewport.width}px`,
      [...consoleErrors, ...pageErrors].join(" | "),
    );

    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

async function checkFallbacks(browser) {
  const reducedContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(`${base}/tours/std02s4?force3d`, {
    waitUntil: "networkidle",
  });
  await reducedPage.locator(".deferred-content").scrollIntoViewIfNeeded();
  await reducedPage.locator(".walk").waitFor({ state: "visible" });
  check(
    (await reducedPage.locator(".rx-toggle").count()) === 0 &&
      (await reducedPage.locator(".walk").count()) === 1,
    "reduced-motion tour fallback uses the 2D walkthrough",
  );
  await reducedContext.close();

  const saveDataContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await saveDataContext.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    });
  });
  const saveDataPage = await saveDataContext.newPage();
  await saveDataPage.goto(`${base}/destinations`, { waitUntil: "networkidle" });
  check(
    (await saveDataPage.locator(".map3d-canvas canvas").count()) === 0 &&
      (await saveDataPage.locator(".map3d-svg").count()) === 1,
    "save-data destination fallback keeps the 2D map",
  );
  await saveDataContext.close();

  const noWebGlContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await noWebGlContext.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(
      type,
      options,
    ) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(type)) {
        return null;
      }
      return original.call(this, type, options);
    };
  });
  const noWebGlPage = await noWebGlContext.newPage();
  await noWebGlPage.goto(`${base}/destinations?force3d`, {
    waitUntil: "networkidle",
  });
  check(
    (await noWebGlPage.locator(".map3d-canvas canvas").count()) === 0 &&
      (await noWebGlPage.locator(".map3d-svg").count()) === 1,
    "no-WebGL destination fallback keeps the 2D map",
  );
  await noWebGlContext.close();
}

const browser = await chromium.launch();

try {
  const context = await browser.newContext({ viewport: viewports[1] });
  const page = await context.newPage();

  await checkIntro(page);
  await checkMarquee(page);
  await checkInputsAndHeadings(page);
  await checkInteractions(page);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await checkWalkthrough(page, "/tours/std02s4", viewport.width);
    await checkWalkthrough(page, "/destinations", viewport.width);
    await checkRoutes(page, viewport);
  }

  await context.close();
  await checkFallbacks(browser);
} catch (error) {
  check(false, "mobile hardening verification completed", String(error));
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} FAILURES` : "\nALL PASS");
process.exit(failures ? 1 : 0);
