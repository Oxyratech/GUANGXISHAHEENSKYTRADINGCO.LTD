// @vitest-environment node
// Guards the design and RTL rules of docs/ARCHITECTURE.md (sections 3, 7 and 9) across the site chrome.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const SRC_DIR = dirname(dirname(import.meta.dirname));
const LOCALE_APP_DIR = join(SRC_DIR, "app", "(site)", "[locale]");
const SCANNED = [
  join(SRC_DIR, "components", "site"),
  join(SRC_DIR, "components", "analytics"),
  join(SRC_DIR, "lib", "analytics"),
  join(LOCALE_APP_DIR, "layout.tsx"),
  join(LOCALE_APP_DIR, "template.tsx"),
  join(LOCALE_APP_DIR, "not-found.tsx"),
  join(LOCALE_APP_DIR, "error.tsx"),
  join(LOCALE_APP_DIR, "[...rest]", "page.tsx"),
];

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

describe("site chrome rules", () => {
  it("scans the chrome sources", () => {
    expect(sources.length).toBeGreaterThan(20);
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

  it("keeps radii at rounded-lg or below and never uses full circles", () => {
    expect(offenders(new RegExp(`${TOKEN_START}rounded-(?:xl|2xl|3xl|full)`, "gm"))).toEqual([]);
  });

  it("uses only the two design shadows", () => {
    expect(
      offenders(new RegExp(`${TOKEN_START}shadow-(?:xs|sm|md|lg|xl|2xl|inner)\\b`, "gm")),
    ).toEqual([]);
  });

  it("styles from tokens: no raw colour literals", () => {
    expect(offenders(/#[0-9a-fA-F]{3,8}\b/g)).toEqual([]);
    expect(offenders(/\b(?:rgb|rgba|hsl|oklch)\(/g)).toEqual([]);
  });

  it("never loops an animation", () => {
    expect(
      offenders(
        /\banimate-(?:pulse|bounce|ping|spin)\b|animation-iteration-count:\s*infinite|\binfinite\b/g,
      ),
    ).toEqual([]);
  });

  it("never prints to the console", () => {
    expect(offenders(/\bconsole\.\w+/g)).toEqual([]);
  });

  it("never hard-codes contact details", () => {
    expect(offenders(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)).toEqual([]);
    expect(offenders(/(?:tel:|wa\.me\/)\+?\d/g)).toEqual([]);
  });
});
