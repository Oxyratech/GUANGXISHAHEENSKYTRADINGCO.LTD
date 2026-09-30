// Guards the design-system rules of docs/ARCHITECTURE.md section 7 in the admin shell, its shared
// components and the admin routes, plus the rule that admin code never renders raw HTML.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const SRC_DIR = dirname(dirname(import.meta.dirname));
const SCANNED = [
  join(SRC_DIR, "components", "admin"),
  join(SRC_DIR, "app", "(admin)"),
  join(SRC_DIR, "server", "admin"),
];

function collect(path: string): string[] {
  if (statSync(path).isDirectory()) {
    return readdirSync(path).flatMap((entry) => collect(join(path, entry)));
  }
  const name = basename(path);
  return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
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

describe("admin design rules", () => {
  it("scans the admin sources", () => {
    expect(sources.length).toBeGreaterThan(50);
  });

  it("uses logical utilities only: no left/right/ml/mr/pl/pr/text-left/text-right", () => {
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
    expect(offenders(/\banimate-(?:pulse|bounce|ping)\b|\binfinite\b/g)).toEqual([]);
  });

  it("never renders raw HTML: React escapes everything the database returns", () => {
    expect(offenders(/dangerouslySetInnerHTML|\.innerHTML\s*=|\binsertAdjacentHTML\b/g)).toEqual(
      [],
    );
  });

  it("logs through the logger, never console", () => {
    expect(offenders(/\bconsole\.(?:log|info|warn|error|debug)\b/g)).toEqual([]);
  });

  it("does not use the locale-aware public router", () => {
    expect(offenders(/from "@\/i18n\/navigation"/g)).toEqual([]);
  });
});
