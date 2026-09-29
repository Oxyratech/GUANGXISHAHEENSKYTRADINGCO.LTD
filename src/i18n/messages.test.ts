// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BUSINESS_SCOPE_ITEMS, SCOPE_GROUPS } from "@/config/business-scope";
import { CATEGORY_SLUGS } from "@/content/categories";
import { SERVICE_SLUGS } from "@/content/services";
import { LOCALES, type Locale } from "./locales";
import { NAMESPACES, type Namespace } from "./namespaces";

/**
 * Integrity of the translation catalogue: every namespace exists in every locale with the same
 * key tree, well-formed text, matching ICU placeholders and no leftovers. Namespaces that are
 * still `{}` in all locales are accepted so that features can be filled in independently.
 */

const MESSAGES_DIR = fileURLToPath(new URL("../messages/", import.meta.url));
const REFERENCE_LOCALE: Locale = "en";
const TRANSLATED_LOCALES = LOCALES.filter((locale) => locale !== REFERENCE_LOCALE);

const SCRIPT_LOCALES = ["zh", "ar"] as const;
type ScriptLocale = (typeof SCRIPT_LOCALES)[number];
const SCRIPT_PATTERN: Record<ScriptLocale, RegExp> = {
  zh: /\p{Script=Han}/u,
  ar: /\p{Script=Arabic}/u,
};

/**
 * Latin tokens that legitimately stay Latin inside Chinese and Arabic text: legal and brand names
 * (never translated, see docs/ARCHITECTURE.md), identifiers, currency codes and file formats.
 * Extend this list rather than weakening the check.
 */
const LATIN_ALLOW_LIST = [
  "GUANGXI SHAHEEN SKY TRADING CO., LTD.",
  "SHAHEEN SKY",
  "Shaheen Sky",
  "AHMED ALI",
  "USCC",
  "RMB",
  "CNY",
  "English",
  "WhatsApp",
  "PDF",
  "DOCX",
  "XLSX",
  "JPG",
  "JPEG",
  "PNG",
  "WebP",
  "MB",
  "KB",
  "GB",
].sort((a, b) => b.length - a.length);

/* ------------------------------------------------------------------ loading and flattening */

const cache = new Map<string, unknown>();

function readMessages(locale: Locale, ns: Namespace): unknown {
  const file = `${locale}/${ns}.json`;
  if (cache.has(file)) return cache.get(file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(`${MESSAGES_DIR}${file}`, "utf8"));
  } catch (error) {
    throw new Error(`src/messages/${file} cannot be read as JSON: ${String(error)}`, {
      cause: error,
    });
  }
  cache.set(file, parsed);
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function childPath(path: string, key: string): string {
  return path === "" ? key : `${path}.${key}`;
}

/** Dotted path -> leaf value. An empty nested container counts as a (non-string) leaf. */
function flatten(
  value: unknown,
  path = "",
  out = new Map<string, unknown>(),
): Map<string, unknown> {
  const children = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : isRecord(value)
      ? Object.entries(value)
      : null;
  if (children === null) {
    out.set(path, value);
  } else if (children.length === 0 && path !== "") {
    out.set(path, value);
  } else {
    for (const [key, child] of children) flatten(child, childPath(path, key), out);
  }
  return out;
}

/** Paths of object keys that contain a dot: next-intl reads "a.b" as a nested path. */
function keysContainingDots(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => keysContainingDots(item, childPath(path, String(index))));
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(key.includes(".") ? [childPath(path, key)] : []),
    ...keysContainingDots(child, childPath(path, key)),
  ]);
}

function leavesOf(locale: Locale, ns: Namespace) {
  return flatten(readMessages(locale, ns));
}

function textLeavesOf(locale: Locale, ns: Namespace): [string, string][] {
  return [...leavesOf(locale, ns)].filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
}

function recordKeys(value: unknown): string[] {
  return isRecord(value) ? Object.keys(value) : [];
}

/* ------------------------------------------------------------------ ICU messages */

interface IcuInfo {
  /** Argument names (`name`, or `name,type` for typed ones) and rich-text tags (`<b>`). */
  readonly placeholders: ReadonlySet<string>;
  /** Translatable text with every ICU construct removed. */
  readonly text: string;
}

const RICH_TAG = /<\/?([A-Za-z][\w-]*)\s*\/?>/y;
const BRANCHING_TYPES = new Set(["plural", "select", "selectordinal"]);

function closingBrace(source: string, open: number): number {
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") depth++;
    else if (source[index] === "}" && --depth === 0) return index;
  }
  throw new Error(`unbalanced "{" in ICU message: ${source}`);
}

function readArgument(body: string, placeholders: Set<string>, text: string[]): void {
  const comma = body.indexOf(",");
  const name = (comma === -1 ? body : body.slice(0, comma)).trim();
  if (!/^[\p{L}\p{N}_]+$/u.test(name)) throw new Error(`invalid ICU argument "{${body}}"`);
  if (comma === -1) {
    placeholders.add(name);
    return;
  }
  const rest = body.slice(comma + 1);
  const type = (rest.includes(",") ? rest.slice(0, rest.indexOf(",")) : rest).trim();
  placeholders.add(`${name},${type}`);
  if (!BRANCHING_TYPES.has(type)) return;
  for (let index = 0; index < rest.length; index++) {
    if (rest[index] !== "{") continue;
    const end = closingBrace(rest, index);
    walk(rest.slice(index + 1, end), placeholders, text);
    index = end;
  }
}

function walk(source: string, placeholders: Set<string>, text: string[]): void {
  let literal = "";
  const flush = () => {
    if (literal.trim() !== "") text.push(literal);
    literal = "";
  };
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === "{") {
      flush();
      const end = closingBrace(source, index);
      readArgument(source.slice(index + 1, end), placeholders, text);
      index = end;
      continue;
    }
    if (char === "<") {
      RICH_TAG.lastIndex = index;
      const tag = RICH_TAG.exec(source);
      if (tag) {
        flush();
        placeholders.add(`<${tag[1]}>`);
        index += tag[0].length - 1;
        continue;
      }
    }
    literal += char;
  }
  flush();
}

/** ICU quoting: `'{'` is a literal brace, a lone apostrophe is just an apostrophe. */
const QUOTED_ICU = /'([{}<>](?:[^']|'')*)'/g;

function parseIcu(message: string): IcuInfo {
  const placeholders = new Set<string>();
  const text: string[] = [];
  const unquoted = message.replace(QUOTED_ICU, (_match, quoted: string) =>
    quoted.replace(/[{}<>]/g, "\u0000"),
  );
  walk(unquoted, placeholders, text);
  return { placeholders, text: text.join(" ") };
}

/* ------------------------------------------------------------------ checks (each returns problems) */

function firstKeyDifference(reference: readonly string[], candidate: readonly string[]) {
  const referenceKeys = new Set(reference);
  const candidateKeys = new Set(candidate);
  const missing = reference.filter((path) => !candidateKeys.has(path));
  const unexpected = candidate.filter((path) => !referenceKeys.has(path));
  if (missing.length > 0) {
    return `missing key "${missing[0]}" that ${REFERENCE_LOCALE} has (${missing.length} missing in total)`;
  }
  if (unexpected.length > 0) {
    return `unexpected key "${unexpected[0]}" that ${REFERENCE_LOCALE} lacks (${unexpected.length} unexpected in total)`;
  }
  return null;
}

function checkKeyTrees(ns: Namespace): string[] {
  const reference = [...leavesOf(REFERENCE_LOCALE, ns).keys()];
  return TRANSLATED_LOCALES.flatMap((locale) => {
    const difference = firstKeyDifference(reference, [...leavesOf(locale, ns).keys()]);
    return difference ? [`${locale}/${ns}.json: ${difference}`] : [];
  });
}

function checkPopulation(ns: Namespace): string[] {
  const populated = LOCALES.filter((locale) => leavesOf(locale, ns).size > 0);
  if (populated.length === 0 || populated.length === LOCALES.length) return [];
  const empty = LOCALES.filter((locale) => !populated.includes(locale));
  return [`${ns}: has content in ${populated.join(", ")} but is empty in ${empty.join(", ")}`];
}

function checkWellFormed(locale: Locale, ns: Namespace): string[] {
  const where = `${locale}/${ns}.json`;
  const problems = keysContainingDots(readMessages(locale, ns)).map(
    (path) => `${where}: key "${path}" contains a dot`,
  );
  for (const [path, value] of leavesOf(locale, ns)) {
    if (typeof value !== "string") problems.push(`${where}: "${path}" is not a string message`);
    else if (value.trim() === "") problems.push(`${where}: "${path}" is empty`);
  }
  return problems;
}

const LEFTOVER_TEXT = /\bTODO\b|\blorem\b|\bXXX\b/i;

function checkLeftovers(locale: Locale, ns: Namespace): string[] {
  return textLeavesOf(locale, ns)
    .filter(([, text]) => LEFTOVER_TEXT.test(text))
    .map(([path, text]) => `${locale}/${ns}.json: "${path}" contains placeholder text: "${text}"`);
}

function placeholdersOf(message: string): string {
  return [...parseIcu(message).placeholders].sort().join(" ");
}

function checkPlaceholders(ns: Namespace): string[] {
  const reference = new Map(textLeavesOf(REFERENCE_LOCALE, ns));
  const problems: string[] = [];
  for (const locale of LOCALES) {
    for (const [path, text] of textLeavesOf(locale, ns)) {
      const where = `${locale}/${ns}.json: "${path}"`;
      try {
        const expected = reference.get(path);
        if (locale === REFERENCE_LOCALE) placeholdersOf(text);
        else if (expected !== undefined && placeholdersOf(text) !== placeholdersOf(expected)) {
          problems.push(
            `${where} uses placeholders [${placeholdersOf(text)}] but ${REFERENCE_LOCALE} uses [${placeholdersOf(expected)}]`,
          );
        }
      } catch (error) {
        problems.push(
          `${where} is not a valid ICU message: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
  return problems;
}

const URL_OR_EMAIL = /https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+/g;

/** Text of a message as a reader sees it: ICU syntax and allow-listed Latin tokens removed. */
function readableText(message: string): string {
  let text: string;
  try {
    text = parseIcu(message).text;
  } catch {
    text = message; // reported by checkPlaceholders
  }
  text = text.replace(URL_OR_EMAIL, " ");
  for (const token of LATIN_ALLOW_LIST) text = text.split(token).join(" ");
  return text;
}

/** True when the text has Latin words but none of the locale's own script: untranslated copy. */
function looksCopiedFromEnglish(locale: ScriptLocale, message: string): boolean {
  const text = readableText(message);
  return !SCRIPT_PATTERN[locale].test(text) && /\p{Script=Latin}/u.test(text);
}

function checkTranslatedScript(locale: ScriptLocale, ns: Namespace): string[] {
  return textLeavesOf(locale, ns)
    .filter(([, text]) => looksCopiedFromEnglish(locale, text))
    .map(
      ([path, text]) =>
        `${locale}/${ns}.json: "${path}" has no ${locale === "zh" ? "Chinese" : "Arabic"} text and looks copied from English: "${text}"`,
    );
}

/* ------------------------------------------------------------------ the catalogue */

describe.each(NAMESPACES)("namespace %s", (ns) => {
  it("is a JSON object in every locale", () => {
    for (const locale of LOCALES) expect(isRecord(readMessages(locale, ns))).toBe(true);
  });

  it("is filled in every locale or in none", () => {
    expect(checkPopulation(ns)).toEqual([]);
  });

  it("has the same key tree in en, zh and ar", () => {
    expect(checkKeyTrees(ns)).toEqual([]);
  });

  it("has only non-empty string messages under valid keys", () => {
    expect(LOCALES.flatMap((locale) => checkWellFormed(locale, ns))).toEqual([]);
  });

  it("uses the same ICU placeholders in every locale", () => {
    expect(checkPlaceholders(ns)).toEqual([]);
  });

  it("contains no TODO, lorem or XXX", () => {
    expect(LOCALES.flatMap((locale) => checkLeftovers(locale, ns))).toEqual([]);
  });

  it("has Chinese and Arabic text that is not copied Latin text", () => {
    expect(SCRIPT_LOCALES.flatMap((locale) => checkTranslatedScript(locale, ns))).toEqual([]);
  });
});

/* ------------------------------------------------------------------ shared content namespaces */

describe("categories namespace", () => {
  const shared = ["availabilityNote", "browseLabel", "otherCategory", "regulatedNote"];

  it.each(LOCALES)(
    "%s covers exactly the registered categories and the shared strings",
    (locale) => {
      const root = readMessages(locale, "categories");
      expect(recordKeys(root).sort()).toEqual([...CATEGORY_SLUGS, ...shared].sort());
      for (const slug of CATEGORY_SLUGS) {
        const category = isRecord(root) ? root[slug] : undefined;
        expect(recordKeys(category).sort(), `${locale}: ${slug}`).toEqual([
          "description",
          "name",
          "scopeIntro",
          "summary",
        ]);
      }
    },
  );
});

describe("services namespace", () => {
  it.each(LOCALES)("%s has a name and summary for exactly the six services", (locale) => {
    const root = readMessages(locale, "services");
    expect(recordKeys(root).sort()).toEqual([...SERVICE_SLUGS].sort());
    for (const slug of SERVICE_SLUGS) {
      const service = isRecord(root) ? root[slug] : undefined;
      expect(recordKeys(service).sort(), `${locale}: ${slug}`).toEqual(["name", "summary"]);
    }
  });
});

describe("scope namespace", () => {
  const topLevel = [
    "generalItemsLabel",
    "groups",
    "intro",
    "items",
    "officialTextLabel",
    "qualifier",
    "regulatedNote",
    "title",
    "translationNote",
  ];

  function itemsOf(locale: Locale): Record<string, unknown> {
    const root = readMessages(locale, "scope");
    const items = isRecord(root) ? root.items : undefined;
    return isRecord(items) ? items : {};
  }

  it.each(LOCALES)("%s has the expected top-level keys", (locale) => {
    expect(recordKeys(readMessages(locale, "scope")).sort()).toEqual(topLevel);
  });

  it.each(LOCALES)("%s has a name and description for every scope group", (locale) => {
    const root = readMessages(locale, "scope");
    const groups = isRecord(root) ? root.groups : undefined;
    expect(recordKeys(groups).sort()).toEqual([...SCOPE_GROUPS].sort());
    for (const group of SCOPE_GROUPS) {
      const entry = isRecord(groups) ? groups[group] : undefined;
      expect(recordKeys(entry).sort(), `${locale}: ${group}`).toEqual(["description", "name"]);
    }
  });

  it.each(LOCALES)("%s translates exactly the registered scope items", (locale) => {
    expect(Object.keys(itemsOf(locale)).sort()).toEqual(
      BUSINESS_SCOPE_ITEMS.map((item) => item.id).sort(),
    );
  });

  it("repeats the license text verbatim in zh", () => {
    const items = itemsOf("zh");
    const differing = BUSINESS_SCOPE_ITEMS.filter((item) => items[item.id] !== item.zh).map(
      (item) => `${item.id}: expected "${item.zh}", found ${JSON.stringify(items[item.id])}`,
    );
    expect(differing).toEqual([]);
  });

  it.each(LOCALES)("%s gives every scope item its own wording", (locale) => {
    const texts = Object.values(itemsOf(locale));
    const repeated = texts.filter((text, index) => texts.indexOf(text) !== index);
    expect(repeated).toEqual([]);
  });
});

/* ------------------------------------------------------------------ house style of shared copy */

describe("house style of the shared content namespaces", () => {
  const namespaces: readonly Namespace[] = ["categories", "services", "scope"];

  // Registered scope is not a track record; see docs/ARCHITECTURE.md section 9.
  const UNSUPPORTED_CLAIMS: Record<Locale, RegExp> = {
    en: /\b(leading|leader|trusted|best|largest|premier|world-class|guarantee[ds]?)\b/i,
    zh: /领先|领导者|最佳|最优|最大|最好|保证|担保|值得信赖|首屈一指/,
    ar: /رائد|أفضل|أكبر|نضمن|ضمان|مضمون|موثوق/,
  };

  // Full-width punctuation in Chinese, Arabic punctuation in Arabic (docs/ARCHITECTURE.md section 3).
  const WRONG_PUNCTUATION: Partial<Record<Locale, RegExp>> = {
    zh: /\p{Script=Han}[,.;:?!()]|[,.;:?!()]\p{Script=Han}/u,
    ar: /\p{Script=Arabic}[,;?]|[,;?]\p{Script=Arabic}/u,
  };

  it.each(namespaces)("%s makes no unsupported claims", (ns) => {
    const found = LOCALES.flatMap((locale) =>
      textLeavesOf(locale, ns)
        .filter(([, text]) => UNSUPPORTED_CLAIMS[locale].test(text))
        .map(([path, text]) => `${locale}/${ns}.json: "${path}": "${text}"`),
    );
    expect(found).toEqual([]);
  });

  it.each(namespaces)("%s uses the punctuation of each language", (ns) => {
    const found = LOCALES.flatMap((locale) => {
      const pattern = WRONG_PUNCTUATION[locale];
      if (!pattern) return [];
      return textLeavesOf(locale, ns)
        .filter(([, text]) => pattern.test(readableText(text)))
        .map(([path, text]) => `${locale}/${ns}.json: "${path}": "${text}"`);
    });
    expect(found).toEqual([]);
  });
});

/* ------------------------------------------------------------------ the checks themselves */

describe("message checks", () => {
  it("reads ICU arguments, branches and rich-text tags", () => {
    const info = parseIcu(
      "Hello {name}, {count, plural, one {# item from <b>{city}</b>} other {# items}} <link>more</link>",
    );
    expect([...info.placeholders].sort()).toEqual([
      "<b>",
      "<link>",
      "city",
      "count,plural",
      "name",
    ]);
    expect(info.text).not.toContain("plural");
  });

  it("treats apostrophes and quoted braces as literal text", () => {
    expect(parseIcu("The company's '{scope}' isn't {name}").placeholders).toEqual(
      new Set(["name"]),
    );
  });

  it("rejects unbalanced braces", () => {
    expect(() => parseIcu("Hello {name")).toThrow(/unbalanced/);
  });

  it("names the first differing key path", () => {
    expect(firstKeyDifference(["a.b", "a.c"], ["a.b", "a.c"])).toBeNull();
    expect(firstKeyDifference(["a.b", "a.c"], ["a.b"])).toMatch(/missing key "a\.c"/);
    expect(firstKeyDifference(["a.b"], ["a.b", "a.x"])).toMatch(/unexpected key "a\.x"/);
  });

  it("treats an empty nested container as a non-string leaf", () => {
    expect([...flatten({ a: { b: "x", c: [] }, d: ["y"] })]).toEqual([
      ["a.b", "x"],
      ["a.c", []],
      ["d.0", "y"],
    ]);
  });

  it("flags Latin-only copy but not translations, brand names or numbers", () => {
    expect(looksCopiedFromEnglish("zh", "Send an inquiry")).toBe(true);
    expect(looksCopiedFromEnglish("ar", "Send an inquiry")).toBe(true);
    expect(looksCopiedFromEnglish("zh", "发送询盘")).toBe(false);
    expect(looksCopiedFromEnglish("ar", "أرسل استفسارًا")).toBe(false);
    expect(looksCopiedFromEnglish("zh", "SHAHEEN SKY")).toBe(false);
    expect(looksCopiedFromEnglish("zh", "RMB 50,000")).toBe(false);
    expect(looksCopiedFromEnglish("ar", "https://www.gsxt.gov.cn/")).toBe(false);
    expect(looksCopiedFromEnglish("zh", "{count, plural, one {# 条} other {# 条}}")).toBe(false);
  });
});
