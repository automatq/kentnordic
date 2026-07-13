import { chromium } from "playwright";

const base = process.env.BASE ?? "http://localhost:5173";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
let failures = 0;

function check(condition, label, detail = "") {
  if (!condition) failures += 1;
  console.log(
    `${condition ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`,
  );
}

function channel(value) {
  value /= 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const channels = hex
    .match(/[a-f\d]{2}/gi)
    .map((value) => channel(Number.parseInt(value, 16)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

await page.goto(`${base}/about`, { waitUntil: "networkidle", timeout: 45_000 });

const expectedTokens = {
  "--color-brand-taupe": "#6d5b51",
  "--color-brand-magenta": "#cc1782",
  "--color-brand-gold": "#fdc613",
  "--color-brand-orange": "#eb994c",
  "--color-brand-coral": "#de7771",
  "--color-accent": "#cc1782",
  "--color-accent-600": "#ad0f6b",
  "--color-accent-700": "#8f0c59",
  "--color-accent-200": "#f0bdd7",
  "--color-cream": "#fff9f3",
  "--color-beige": "#f6eee6",
  "--color-grey": "#e5d8cd",
  "--color-ink": "#2c2421",
  "--color-charcoal": "#3b312c",
  "--color-charcoal-soft": "#6d5b51",
  "--color-ink-2": "#1d1715",
};

const tokens = await page.evaluate((names) => {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    names.map((name) => [
      name,
      style.getPropertyValue(name).trim().toLowerCase(),
    ]),
  );
}, Object.keys(expectedTokens));

for (const [name, expected] of Object.entries(expectedTokens)) {
  check(
    tokens[name] === expected,
    `${name} resolves to ${expected}`,
    tokens[name],
  );
}

const primary = await page
  .locator("a.bg-accent, button.bg-accent")
  .first()
  .evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });
check(
  primary.background === "rgb(204, 23, 130)",
  "primary action uses solid magenta",
  primary.background,
);
check(
  primary.color === "rgb(255, 255, 255)",
  "primary action uses white text",
  primary.color,
);

const gradient = await page.evaluate(() =>
  getComputedStyle(document.documentElement)
    .getPropertyValue("--gradient-brand")
    .trim(),
);
for (const color of ["#fdc613", "#eb994c", "#de7771", "#cc1782"]) {
  check(
    gradient.toLowerCase().includes(color),
    `signature gradient includes ${color}`,
    gradient,
  );
}

for (const [label, foreground, background] of [
  ["white on magenta", "ffffff", "cc1782"],
  ["taupe on cream", "6d5b51", "fff9f3"],
  ["ink on gold", "2c2421", "fdc613"],
]) {
  const ratio = contrast(foreground, background);
  check(
    ratio >= 4.5,
    `${label} contrast is at least 4.5:1`,
    `${ratio.toFixed(2)}:1`,
  );
}

await context.close();
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : "\nALL PASS");
process.exit(failures ? 1 : 0);
