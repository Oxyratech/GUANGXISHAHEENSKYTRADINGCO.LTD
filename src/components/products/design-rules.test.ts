// @vitest-environment node
// Guards the design, RTL and honesty rules of docs/ARCHITECTURE.md (sections 3, 7 and 9) across the
// product platform: components, repository and pages.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const SRC_DIR = dirname(dirname(import.meta.dirname));
const SCANNED = [
  join(SRC_DIR, "components", "products"),
  join(SRC_DIR, "server", "products"),
  join(SRC_DIR, "app", "(site)", "[locale]", "products"),
];

function collect(path: string): string[] {
  if (statSync(path).isDirectory()) {
    return readdirSync(path).flatMap((entry) => collect(join(path, entry)));
  }
  const name = basename(path);
  const isSource =
    /\.tsx?$/.test(name) &&
    !/\.test\.tsx?$/.test(name) &&
    name !== "test-utils.tsx" &&
    name !== "test-repository.ts";
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

describe("product platform rules", () => {
  it("scans the product sources", () => {
    expect(sources.length).toBeGreaterThan(30);
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

  it("never prints to the console and never uses next/link or a raw <main>", () => {
    expect(offenders(/\bconsole\.\w+/g)).toEqual([]);
    expect(offenders(/from "next\/link"/g)).toEqual([]);
    expect(offenders(/<main[\s>]/g)).toEqual([]);
  });

  it("never hard-codes contact details or currency amounts", () => {
    expect(offenders(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)).toEqual([]);
    expect(offenders(/(?:tel:|wa\.me\/)\+?\d/g)).toEqual([]);
    expect(offenders(/(?:\$|€|¥|USD|RMB|CNY)\s?\d/g)).toEqual([]);
  });

  it("makes no price, availability or rating claims in structured data or copy", () => {
    expect(
      offenders(/["']?\b(?:offers|priceCurrency|aggregateRating|availability)\b["']?\s*:/g),
    ).toEqual([]);
  });

  it("reads translations with an explicit locale, so the pages stay static", () => {
    const calls = sources.flatMap((file) =>
      [...file.text.matchAll(/getTranslations\(([^)]*)\)/g)].map((match) => ({
        file: file.name,
        arguments: match[1] ?? "",
      })),
    );
    expect(calls.length).toBeGreaterThan(10);
    expect(calls.filter((call) => !/locale/.test(call.arguments)).map((call) => call.file)).toEqual(
      [],
    );
  });
});
