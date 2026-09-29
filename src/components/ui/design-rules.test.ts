// Guards the design-system rules from docs/ARCHITECTURE.md §3 and §7 across ui, layout, motion and icons.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const COMPONENTS_DIR = dirname(import.meta.dirname);
const SCANNED = ["ui", "layout", "motion", "icons.tsx"];

function collect(path: string): string[] {
  if (statSync(path).isDirectory()) {
    return readdirSync(path).flatMap((entry) => collect(join(path, entry)));
  }
  const name = basename(path);
  const isSource =
    /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.startsWith("test-utils");
  return isSource ? [path] : [];
}

const sources = SCANNED.flatMap((entry) => collect(join(COMPONENTS_DIR, entry))).map((path) => ({
  name: relative(COMPONENTS_DIR, path).replaceAll("\\", "/"),
  text: readFileSync(path, "utf8"),
}));

function offenders(pattern: RegExp, allow: string[] = []): string[] {
  return sources
    .filter((file) => !allow.includes(file.name))
    .flatMap((file) =>
      [...file.text.matchAll(pattern)].map((match) => `${file.name}: ${match[0].trim()}`),
    );
}

// A class token starts after whitespace, a quote or a variant colon.
const TOKEN_START = String.raw`(?:^|[\s"'\`:!])`;

describe("design system rules", () => {
  it("scans the component sources", () => {
    expect(sources.length).toBeGreaterThan(40);
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

  it("keeps radii at rounded-lg or below; full circles only for radio buttons", () => {
    expect(offenders(new RegExp(`${TOKEN_START}rounded-(?:xl|2xl|3xl)`, "gm"))).toEqual([]);
    expect(
      offenders(new RegExp(`${TOKEN_START}rounded-full`, "gm"), ["ui/radio-group.tsx"]),
    ).toEqual([]);
  });

  it("uses only the two design shadows", () => {
    expect(
      offenders(new RegExp(`${TOKEN_START}shadow-(?:xs|sm|md|lg|xl|2xl|inner)\\b`, "gm")),
    ).toEqual([]);
  });

  it("styles from tokens: no raw colour literals in components", () => {
    expect(offenders(/#[0-9a-fA-F]{3,8}\b/g)).toEqual([]);
    expect(offenders(/\b(?:rgb|rgba|hsl|oklch)\(/g)).toEqual([]);
  });

  it("never loops an animation", () => {
    expect(
      offenders(
        /\banimate-(?:pulse|bounce|ping)\b|animation-iteration-count:\s*infinite|\binfinite\b/g,
      ),
    ).toEqual([]);
  });
});
