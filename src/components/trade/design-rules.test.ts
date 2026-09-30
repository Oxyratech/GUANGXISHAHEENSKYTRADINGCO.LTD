// @vitest-environment node
// Guards the design and RTL rules of docs/ARCHITECTURE.md (sections 3, 7 and 9) across the Global Trade sources.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const SRC_DIR = dirname(dirname(import.meta.dirname));
const SCANNED = [
  join(SRC_DIR, "components", "trade"),
  join(SRC_DIR, "app", "(site)", "[locale]", "global-trade"),
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

describe("Global Trade sources", () => {
  it("scans the components and both pages", () => {
    expect(sources.length).toBeGreaterThanOrEqual(12);
    expect(sources.map((file) => file.name)).toEqual(
      expect.arrayContaining([
        "components/trade/ProcessTimeline.tsx",
        "app/(site)/[locale]/global-trade/page.tsx",
        "app/(site)/[locale]/global-trade/how-it-works/page.tsx",
      ]),
    );
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

  it("never prints to the console or renders its own <main>", () => {
    expect(offenders(/\bconsole\.\w+/g)).toEqual([]);
    expect(offenders(/<main[\s>]/g)).toEqual([]);
  });

  it("reads translations with an explicit locale where the caller has one", () => {
    // getTranslations("ns") is only allowed in ProcessTimeline, whose locale prop is optional.
    const bare = offenders(/getTranslations\(\s*["'`]/g).filter(
      (entry) => !entry.startsWith("components/trade/ProcessTimeline.tsx"),
    );
    expect(bare).toEqual([]);
  });

  it("uses the locale-aware links and never next/link", () => {
    expect(offenders(/from "next\/link"/g)).toEqual([]);
  });
});
