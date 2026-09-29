#!/usr/bin/env node
/**
 * Route smoke test against a running production server (npm run build && npm start).
 *
 *   node scripts/smoke-routes.mjs [baseUrl]        # default http://localhost:3000
 *
 * For every public route in every locale it checks: HTTP 200, <html lang dir>, exactly one <h1>,
 * canonical + hreflang alternates, parseable JSON-LD, and no leaked i18n/`undefined` artefacts.
 * Exits non-zero on any failure so it can gate CI.
 */
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

const LOCALES = {
  en: { lang: "en", dir: "ltr" },
  zh: { lang: "zh-CN", dir: "ltr" },
  ar: { lang: "ar", dir: "rtl" },
};

const SERVICES = [
  "international-trading",
  "import-export",
  "product-sourcing",
  "supplier-coordination",
  "business-procurement",
  "cross-border-trade",
];
const CATEGORIES = [
  "consumer-goods",
  "apparel-accessories",
  "food-products",
  "household-products",
  "building-materials",
  "decorative-materials",
  "hardware-products",
  "electrical-products",
  "machinery-equipment",
  "metal-products",
  "minerals-ores",
  "medical-protective-supplies",
];

const PATHS = [
  "",
  "/about",
  "/business",
  ...SERVICES.map((s) => `/business/${s}`),
  "/products",
  ...CATEGORIES.map((c) => `/products/${c}`),
  "/global-trade",
  "/global-trade/how-it-works",
  "/company-information",
  "/news",
  "/faq",
  "/contact",
  "/inquiry",
  "/privacy-policy",
  "/terms",
  "/cookies",
];

const failures = [];
const fail = (url, msg) => failures.push(`${url}  ->  ${msg}`);

function attr(tag, name) {
  const m = new RegExp(`${name}="([^"]*)"`, "i").exec(tag);
  return m ? m[1] : null;
}

async function check(locale, path) {
  const url = `${BASE}/${locale}${path}`;
  let res;
  try {
    res = await fetch(url, { redirect: "manual" });
  } catch (e) {
    return fail(url, `request failed: ${e.message}`);
  }
  if (res.status !== 200) return fail(url, `HTTP ${res.status}`);
  const html = await res.text();
  const { lang, dir } = LOCALES[locale];

  const htmlTag = /<html[^>]*>/i.exec(html)?.[0] ?? "";
  if (attr(htmlTag, "lang") !== lang)
    fail(url, `html lang is "${attr(htmlTag, "lang")}", expected "${lang}"`);
  if (attr(htmlTag, "dir") !== dir)
    fail(url, `html dir is "${attr(htmlTag, "dir")}", expected "${dir}"`);

  const h1s = html.match(/<h1[\s>]/gi) ?? [];
  if (h1s.length !== 1) fail(url, `expected exactly one <h1>, found ${h1s.length}`);

  if (!/<title>[^<]+<\/title>/i.test(html)) fail(url, "missing <title>");
  if (!/<meta[^>]+name="description"[^>]+content="[^"]{20,}"/i.test(html))
    fail(url, "missing/short meta description");
  if (!/<link[^>]+rel="canonical"/i.test(html)) fail(url, "missing canonical");
  const alternates = html.match(/<link[^>]+rel="alternate"[^>]+hreflang="[^"]+"/gi) ?? [];
  if (alternates.length < 4)
    fail(
      url,
      `expected >=4 hreflang alternates (en, zh-CN, ar, x-default), found ${alternates.length}`,
    );

  for (const m of html.matchAll(
    /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      JSON.parse(m[1]);
    } catch {
      fail(url, "invalid JSON-LD");
    }
  }

  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  for (const bad of [
    "MISSING_MESSAGE",
    "[object Object]",
    ">undefined<",
    ">null<",
    "Lorem ipsum",
    "Coming soon",
  ]) {
    if (visible.includes(bad)) fail(url, `contains "${bad}"`);
  }
  // Physical-direction utilities must never ship (RTL correctness).
  if (/class="[^"]*\b(?:ml|mr|pl|pr)-\d/.test(visible))
    fail(url, "physical margin/padding utility (ml/mr/pl/pr) found");
}

const jobs = [];
for (const locale of Object.keys(LOCALES)) for (const path of PATHS) jobs.push([locale, path]);

const CONCURRENCY = 6;
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < jobs.length) {
      const [locale, path] = jobs[next++];
      await check(locale, path);
    }
  }),
);

// Non-localised endpoints and metadata routes.
for (const [path, status] of [
  ["/sitemap.xml", 200],
  ["/robots.txt", 200],
  ["/api/health", 200],
  ["/manifest.webmanifest", 200],
]) {
  const res = await fetch(`${BASE}${path}`).catch(() => null);
  if (!res || res.status !== status)
    fail(`${BASE}${path}`, `expected ${status}, got ${res?.status ?? "no response"}`);
}
const missing = await fetch(`${BASE}/en/this-page-does-not-exist`).catch(() => null);
if (!missing || missing.status !== 404)
  fail(`${BASE}/en/this-page-does-not-exist`, `expected 404, got ${missing?.status}`);

if (failures.length > 0) {
  process.stderr.write(
    `\n${failures.length} smoke failure(s):\n${failures.map((f) => `  - ${f}`).join("\n")}\n`,
  );
  process.exit(1);
}
process.stdout.write(
  `Smoke test passed: ${jobs.length} localized pages + metadata endpoints OK.\n`,
);
