// @vitest-environment node
// Guards the design, RTL and honesty rules of docs/ARCHITECTURE.md (sections 3, 7 and 9) across the
// news feature: its components, its pages and its copy.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const SRC_DIR = dirname(dirname(import.meta.dirname));
const SCANNED = [
  join(SRC_DIR, "components", "news"),
  join(SRC_DIR, "app", "(site)", "[locale]", "news"),
  join(SRC_DIR, "server", "news"),
];
const MESSAGE_FILES = ["en", "zh", "ar"].map((locale) =>
  join(SRC_DIR, "messages", locale, "news.json"),
);

function collect(path: string): string[] {
  if (statSync(path).isDirectory()) {
    return readdirSync(path).flatMap((entry) => collect(join(path, entry)));
  }
  const name = basename(path);
  const isSource = /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && name !== "test-utils.tsx";
  return isSource ? [path] : [];
}

const sources = SCANNED.flatMap(collect).map((path) => ({
  name: relative(SRC_DIR, path).replaceAll("\\", "/"),
  text: readFileSync(path, "utf8"),
}));

function offenders(pattern: RegExp): string[] {
  return sources.flatMap((file) =>
    [...file.text.matchAll(pattern)].map((match) => `${file.name}: ${match[0].trim()}`),
  );
}

// A class token starts after whitespace, a quote or a variant colon.
const TOKEN_START = String.raw`(?:^|[\s"'\`:!])`;

describe("news feature rules", () => {
  it("scans the news sources", () => {
    expect(sources.length).toBeGreaterThan(15);
  });

  it("uses logical utilities only (RTL): no left/right/ml/mr/pl/pr/text-left/text-right", () => {
    expect(
      offenders(
        new RegExp(`${TOKEN_START}-?(?:ml|mr|pl|pr|left|right)-(?:\\d|px|auto|full|\\[)`, "gm"),
      ),
    ).toEqual([]);
    expect(offenders(new RegExp(`${TOKEN_START}text-(?:left|right)\\b`, "gm"))).toEqual([]);
    expect(
      offenders(
        new RegExp(`${TOKEN_START}(?:rounded|border)-(?:l|r|tl|tr|bl|br)(?:-|[\\s"'\`])`, "gm"),
      ),
    ).toEqual([]);
  });

  it("keeps radii at rounded-lg or below and uses only the two design shadows", () => {
    expect(offenders(new RegExp(`${TOKEN_START}rounded-(?:xl|2xl|3xl|full)`, "gm"))).toEqual([]);
    expect(
      offenders(new RegExp(`${TOKEN_START}shadow-(?:xs|sm|md|lg|xl|2xl|inner)\\b`, "gm")),
    ).toEqual([]);
  });

  it("styles from tokens: no raw colour literals", () => {
    expect(offenders(/#[0-9a-fA-F]{3,8}\b/g)).toEqual([]);
    expect(offenders(/\b(?:rgb|rgba|hsl|oklch)\(/g)).toEqual([]);
  });

  it("never prints to the console, uses next/link, or builds HTML from strings", () => {
    expect(offenders(/\bconsole\.\w+/g)).toEqual([]);
    expect(offenders(/from "next\/link"/g)).toEqual([]);
    expect(offenders(/dangerouslySetInnerHTML|\.innerHTML\b/g)).toEqual([]);
  });

  it("never renders its own <main> (the locale layout owns it)", () => {
    expect(offenders(/<main[\s>]/g)).toEqual([]);
  });

  it("never hard-codes contact details", () => {
    expect(offenders(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)).toEqual([]);
    expect(offenders(/(?:tel:|wa\.me\/)\+?\d/g)).toEqual([]);
  });
});

describe("news copy", () => {
  const copy = MESSAGE_FILES.map((file) => readFileSync(file, "utf8"));

  it("makes no superlative claims and never says 'coming soon'", () => {
    const banned =
      /\b(?:leading|best|trusted|largest|premier|number one|coming soon)\b|#1|领先|最佳|首屈一指|即将推出|敬请期待|الرائدة|الأفضل|قريبًا/i;
    for (const text of copy) expect(text).not.toMatch(banned);
  });
});
