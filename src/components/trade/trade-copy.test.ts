// @vitest-environment node
import { describe, expect, it } from "vitest";
import { TRADE_PROCESS_STEPS } from "@/content/process";
import { LOCALES, type Locale } from "@/i18n/locales";
import ar from "@/messages/ar/globalTrade.json";
import en from "@/messages/en/globalTrade.json";
import zh from "@/messages/zh/globalTrade.json";

/**
 * House rules for the Global Trade copy (docs/ARCHITECTURE.md section 9): typical and hedged, no
 * figures, no superlatives, no promises. The catalogue-wide checks live in src/i18n/messages.test.ts.
 */

const CATALOGUES = { en, zh, ar } satisfies Record<Locale, unknown>;
type Tree = { [key: string]: string | Tree };

/** Dotted path to text, for every string in the catalogue. */
function texts(tree: Tree, path = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string"
      ? [[path ? `${path}.${key}` : key, value] as [string, string]]
      : texts(value, path ? `${path}.${key}` : key),
  );
}

const HEDGE: Record<Locale, RegExp> = {
  en: /^Typically /,
  zh: /通常/,
  ar: /^عادةً ما /,
};

const UNSUPPORTED_CLAIMS: Record<Locale, RegExp> = {
  en: /\b(leading|leader|trusted|best|largest|premier|world-class|guarantee[ds]?|certified|award(?:s|ed)?|coming soon)\b/i,
  zh: /领先|领导者|最佳|最优|最大|最好|保证|担保|值得信赖|首屈一指|即将推出/,
  ar: /رائد|أفضل|أكبر|نضمن|ضمان|مضمون|موثوق|قريبًا/,
};

/** Transit times and lead times are never stated: they are confirmed per inquiry. */
const TIME_UNITS: Record<Locale, RegExp> = {
  en: /\b(hours?|days?|weeks?|months?)\b/i,
  zh: /小时|天|周|个月/,
  ar: /ساعة|ساعات|يوم|أيام|أسبوع|أسابيع|شهر|أشهر/,
};

const WRONG_PUNCTUATION: Partial<Record<Locale, RegExp>> = {
  zh: /\p{Script=Han}[,.;:?!()]|[,.;:?!()]\p{Script=Han}/u,
  ar: /\p{Script=Arabic}[,;?]|[,;?]\p{Script=Arabic}/u,
};

describe.each(LOCALES)("globalTrade copy in %s", (locale) => {
  const catalogue = CATALOGUES[locale] as unknown as Tree;
  const all = texts(catalogue);

  it("describes each of the eight steps with a title, summary, detail and two lists of three", () => {
    const process = catalogue.process as Tree;
    for (const step of TRADE_PROCESS_STEPS) {
      const entry = process[step] as Tree;
      expect(Object.keys(entry).sort(), step).toEqual([
        "detail",
        "do",
        "provide",
        "summary",
        "title",
      ]);
      expect(Object.keys(entry.provide as Tree), step).toEqual(["a", "b", "c"]);
      expect(Object.keys(entry.do as Tree), step).toEqual(["a", "b", "c"]);
    }
    expect(Object.keys(process).sort()).toEqual(
      [...TRADE_PROCESS_STEPS, "doLabel", "label", "note", "provideLabel"].sort(),
    );
  });

  it("hedges every 'what we do' line as typical", () => {
    const process = catalogue.process as Tree;
    for (const step of TRADE_PROCESS_STEPS) {
      const actions = (process[step] as Tree).do as Tree;
      for (const [key, text] of Object.entries(actions)) {
        expect(text, `${step}.do.${key}`).toMatch(HEDGE[locale]);
      }
    }
  });

  it("states figures nowhere: no counts, prices, lead times or transit times", () => {
    expect(all.filter(([, text]) => /\d/.test(text))).toEqual([]);
    expect(all.filter(([, text]) => TIME_UNITS[locale].test(text))).toEqual([]);
  });

  it("makes no unsupported claim", () => {
    expect(all.filter(([, text]) => UNSUPPORTED_CLAIMS[locale].test(text))).toEqual([]);
  });

  it("uses the punctuation of the language", () => {
    const pattern = WRONG_PUNCTUATION[locale];
    if (!pattern) return;
    expect(all.filter(([, text]) => pattern.test(text))).toEqual([]);
  });
});

describe("globalTrade glossary terms", () => {
  it("labels the process as typical in every language", () => {
    expect(en.process.label).toBe("Typical Trade Process");
    expect(zh.process.label).toBe("典型贸易流程");
    expect(ar.process.label).toBe("مسار التجارة المعتاد");
  });

  it("uses American spelling in English", () => {
    const british = /\b(licences?|labelling|colour|organis\w+|programme|centre)\b/i;
    expect(texts(en as Tree).filter(([, text]) => british.test(text))).toEqual([]);
  });
});
