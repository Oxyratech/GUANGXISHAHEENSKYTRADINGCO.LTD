// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SERVICE_SLUGS } from "@/content/services";
import { TRADE_PROCESS_STEPS } from "@/content/process";
import { LOCALES, type Locale } from "@/i18n/locales";
import ar from "@/messages/ar/business.json";
import en from "@/messages/en/business.json";
import zh from "@/messages/zh/business.json";

/**
 * The business namespace holds the copy of /business and of the six line pages. The generic
 * catalogue checks live in src/i18n/messages.test.ts; these are the ones that belong to this
 * namespace: its shape, the claims it must not make and the language it must be written in.
 */

const CATALOGUES: Record<Locale, typeof en> = { en, zh, ar };
const business = (locale: Locale) => CATALOGUES[locale];

/** Every text message of the namespace, with its dotted path. */
function texts(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    texts(child, path === "" ? key : `${path}.${key}`),
  );
}

// Registered scope is not a track record; see docs/ARCHITECTURE.md section 9.
const UNSUPPORTED_CLAIMS: Record<Locale, RegExp> = {
  en: /\b(leading|leader|trusted|best|largest|premier|world-class|guarantee[ds]?)\b|coming soon/i,
  zh: /领先|领导者|最佳|最优|最大|最好|保证|担保|值得信赖|首屈一指|敬请期待/,
  ar: /رائد|أفضل|أكبر|نضمن|ضمان|مضمون|موثوق|قريبًا/,
};

// Full-width punctuation in Chinese, Arabic punctuation in Arabic (docs/ARCHITECTURE.md section 3).
const WRONG_PUNCTUATION: Partial<Record<Locale, RegExp>> = {
  zh: /\p{Script=Han}[,.;:?!()]|[,.;:?!()]\p{Script=Han}/u,
  ar: /\p{Script=Arabic}[,;?]|[,;?]\p{Script=Arabic}/u,
};

describe.each(LOCALES)("business namespace (%s)", (locale) => {
  const messages = business(locale);

  it("has a meta title and description for /business and for each of the six lines", () => {
    expect(messages.meta.title.length).toBeGreaterThan(0);
    expect(messages.meta.description.length).toBeGreaterThan(0);
    expect(Object.keys(messages.pages).sort()).toEqual([...SERVICE_SLUGS].sort());
    for (const slug of SERVICE_SLUGS) {
      const { meta, hero } = messages.pages[slug];
      expect(meta.title.length, `${slug} title`).toBeGreaterThan(0);
      expect(meta.description.length, `${slug} description`).toBeGreaterThan(0);
      expect(hero.lead.length, `${slug} lead`).toBeGreaterThan(0);
    }
  });

  it("keeps meta text short enough for a search result", () => {
    // Roughly what a search result shows before it cuts the text off.
    const titleLimit = locale === "zh" ? 32 : 60;
    const descriptionLimit = locale === "zh" ? 120 : 160;
    const entries = [messages.meta, ...SERVICE_SLUGS.map((slug) => messages.pages[slug].meta)];
    for (const { title, description } of entries) {
      expect(title.length).toBeLessThanOrEqual(titleLimit);
      expect(description.length).toBeLessThanOrEqual(descriptionLimit);
    }
  });

  it("names every step of the typical trade process in the teaser", () => {
    expect(Object.keys(messages.index.process.steps).sort()).toEqual(
      [...TRADE_PROCESS_STEPS].sort(),
    );
  });

  it("makes no unsupported claim", () => {
    const found = texts(messages).filter(([, text]) => UNSUPPORTED_CLAIMS[locale].test(text));
    expect(found).toEqual([]);
  });

  it("uses the punctuation of its language", () => {
    const pattern = WRONG_PUNCTUATION[locale];
    if (!pattern) return;
    // ICU syntax and rich-text tags are not prose.
    const prose = ([path, text]: [string, string]): [string, string] => [
      path,
      text.replace(/<\/?\w+>|\{[^}]*\}/g, " "),
    ];
    expect(
      texts(messages)
        .map(prose)
        .filter(([, text]) => pattern.test(text)),
    ).toEqual([]);
  });

  it("promises no timeline, price, volume or count", () => {
    const figures =
      /\b\d+\s*(?:hours?|days?|weeks?|months?|years?|countries|suppliers|clients|customers)\b|[$€£¥￥%]|\bUSD\b|\bRMB\b|\d+\s*(?:小时|天|周|个月|年|个国家|家供应商|位客户)/i;
    expect(texts(messages).filter(([, text]) => figures.test(text))).toEqual([]);
  });
});

describe("business namespace: language", () => {
  it("writes Chinese and Arabic copy in their own scripts", () => {
    const script = { zh: /\p{Script=Han}/u, ar: /\p{Script=Arabic}/u } as const;
    for (const locale of ["zh", "ar"] as const) {
      const missing = texts(business(locale)).filter(([, text]) => !script[locale].test(text));
      expect(missing, locale).toEqual([]);
    }
  });

  it("never translates or transliterates the legal names", () => {
    for (const locale of LOCALES) {
      for (const [path, text] of texts(business(locale))) {
        expect(text, `${locale} ${path}`).not.toMatch(
          /GUANGXI SHAHEEN|广西沙欣斯凯商贸|شاهين سكاي للتجارة/i,
        );
      }
    }
  });
});
