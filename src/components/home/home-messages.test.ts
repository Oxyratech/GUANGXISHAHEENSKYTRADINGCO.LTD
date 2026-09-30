// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/locales";
import ar from "@/messages/ar/home.json";
import en from "@/messages/en/home.json";
import zh from "@/messages/zh/home.json";

/**
 * The `home` namespace holds the homepage copy. The generic catalogue checks (key parity, ICU
 * placeholders, non-empty strings) live in src/i18n/messages.test.ts; these are the ones specific
 * to this namespace: its shape, the honesty rules it must keep (docs/ARCHITECTURE.md section 9) and
 * the language it must be written in.
 */

const CATALOGUES: Record<Locale, typeof en> = { en, zh, ar };
const home = (locale: Locale) => CATALOGUES[locale];

const WHY_POINT_KEYS = ["verifiable", "scope", "inquiryProcess", "languages", "contact"] as const;

function texts(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    texts(child, path === "" ? key : `${path}.${key}`),
  );
}

// Registered scope is not a track record or a performance claim; see docs/ARCHITECTURE.md section 9.
const UNSUPPORTED_CLAIMS: Record<Locale, RegExp> = {
  en: /\b(leading|leader|trusted|best|largest|premier|world-class|number one|#1|years of experience|guarantee[ds]?)\b|coming soon/i,
  zh: /领先|领导者|最佳|最优|最大|最好|保证|担保|值得信赖|首屈一指|敬请期待|多年经验/,
  ar: /رائد|أفضل|أكبر|نضمن|ضمان|مضمونة|موثوق|متوفر قريبًا|سنوات من الخبرة/,
};

// Full-width punctuation in Chinese, Arabic punctuation in Arabic (docs/ARCHITECTURE.md section 3).
const WRONG_PUNCTUATION: Partial<Record<Locale, RegExp>> = {
  zh: /\p{Script=Han}[,.;:?!()]|[,.;:?!()]\p{Script=Han}/u,
  ar: /\p{Script=Arabic}[,;?]|[,;?]\p{Script=Arabic}/u,
};

describe.each(LOCALES)("home namespace (%s)", (locale) => {
  const messages = home(locale);

  it("has a meta title and description", () => {
    expect(messages.meta.title.length).toBeGreaterThan(0);
    expect(messages.meta.description.length).toBeGreaterThan(0);
  });

  it("has exactly the five 'why work with us' points, and none about experience, speed, network size, quality guarantees or staff language ability", () => {
    expect(Object.keys(messages.why.points).sort()).toEqual([...WHY_POINT_KEYS].sort());
  });

  it("names the four credibility facts", () => {
    expect(Object.keys(messages.credibility.facts).sort()).toEqual(
      ["established", "capital", "location", "focus"].sort(),
    );
  });

  it("makes no unsupported claim anywhere in the namespace", () => {
    const found = texts(messages).filter(([, text]) => UNSUPPORTED_CLAIMS[locale].test(text));
    expect(found).toEqual([]);
  });

  it("never mentions staff experience, delivery speed or network/partner size", () => {
    const patterns: Record<Locale, RegExp> = {
      en: /\b(years? of experience|fast(?:est)? (?:delivery|shipping|turnaround)|network of (?:suppliers|partners|offices)|our (?:staff|team) speaks?)\b/i,
      zh: /多年经验|快速发货|供应商网络|合作伙伴网络|我们的(?:员工|团队)会说/,
      ar: /سنوات من الخبرة|شحن سريع|شبكة (?:موردين|شركاء)|فريقنا يتحدث/,
    };
    const found = texts(messages).filter(([, text]) => patterns[locale].test(text));
    expect(found).toEqual([]);
  });

  it("uses the punctuation of its language", () => {
    const pattern = WRONG_PUNCTUATION[locale];
    if (!pattern) return;
    const found = texts(messages).filter(([, text]) => pattern.test(text));
    expect(found).toEqual([]);
  });
});

describe("home namespace: registered capital", () => {
  it("never restates the registered capital as anything other than RMB 50,000", () => {
    for (const locale of LOCALES) {
      const found = texts(home(locale)).filter(([, text]) =>
        /(?:5|五)\s*(?:million|百万)/i.test(text),
      );
      expect(found).toEqual([]);
    }
  });
});
