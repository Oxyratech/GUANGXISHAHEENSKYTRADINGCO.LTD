// @vitest-environment node
import { LOCALES, type Locale } from "@/i18n/locales";
import arFaq from "@/messages/ar/faq.json";
import enFaq from "@/messages/en/faq.json";
import zhFaq from "@/messages/zh/faq.json";
import { FAQ_GROUPS } from "./faq-outline";

/** The tags and arguments faq-content.tsx supplies. Any other one would fail at render time. */
const KNOWN_TAGS = ["company", "contact", "inquiry", "process", "products", "en", "zh"];
const KNOWN_ARGUMENTS = ["count", "legalName", "legalNameZh"];

const CATALOGUE: Record<Locale, typeof enFaq> = { en: enFaq, zh: zhFaq, ar: arFaq };

const QUESTION_MARK: Record<Locale, string> = { en: "?", zh: "？", ar: "؟" };

// The brief: FAQ answers are honest and non-committal. These patterns mirror the house style of the
// shared content namespaces and add promises the FAQ must never make (guarantees, delivery times).
const PROMISES: Record<Locale, RegExp> = {
  en: /\b(leading|leader|trusted|best|largest|premier|world-class|guarantee[ds]?|MOQ|within \d+|\d+\s*(?:hours?|days?|weeks?|months?))\b/i,
  zh: /领先|领导者|最佳|最优|最大|最好|保证|担保|值得信赖|首屈一指|最低起订|\d+\s*(?:小时|天|周|个月)内/,
  ar: /رائد|أفضل|أكبر|نضمن|ضمان|مضمون|موثوق|الحد الأدنى للطلب|خلال \d+/,
};

const tagsIn = (text: string) => [...text.matchAll(/<\/?([A-Za-z]+)>/g)].map((match) => match[1]);
const argumentsIn = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);

describe.each(LOCALES)("faq messages (%s)", (locale) => {
  const catalogue = CATALOGUE[locale];
  const items = Object.entries(catalogue.items);

  it("keeps the groups and questions in the same order as English", () => {
    expect(Object.keys(catalogue.groups)).toEqual(Object.keys(enFaq.groups));
    expect(Object.keys(catalogue.items)).toEqual(Object.keys(enFaq.items));
  });

  it("orders the messages the way the page does", () => {
    expect(Object.keys(catalogue.items)).toEqual(FAQ_GROUPS.flatMap((group) => group.items));
  });

  it("writes every question as a question", () => {
    const notQuestions = items.filter(([, item]) => !item.question.endsWith(QUESTION_MARK[locale]));
    expect(notQuestions.map(([id]) => id)).toEqual([]);
  });

  it("uses only tags and arguments the page supplies", () => {
    for (const [id, item] of items) {
      const tags = tagsIn(item.answer);
      expect(
        tags.filter((tag) => !KNOWN_TAGS.includes(tag)),
        `${id}: tags`,
      ).toEqual([]);
      expect(
        argumentsIn(item.answer).filter((name) => !KNOWN_ARGUMENTS.includes(name)),
        `${id}: arguments`,
      ).toEqual([]);
      // Every opened tag is closed.
      expect(item.answer.match(/<[A-Za-z]+>/g)?.length ?? 0, id).toBe(
        item.answer.match(/<\/[A-Za-z]+>/g)?.length ?? 0,
      );
    }
  });

  it("makes no promise: no superlatives, guarantees, order minimums or delivery times", () => {
    const offending = items.flatMap(([id, item]) =>
      [item.question, item.answer]
        .filter((text) => PROMISES[locale].test(text))
        .map((text) => `${id}: ${text}`),
    );
    expect(offending).toEqual([]);
  });

  it("gives the attachment limit and every accepted format the brief lists", () => {
    const { answer } = catalogue.items.attachments;
    for (const token of ["5 MB", "PDF", "JPG", "PNG", "WebP", "DOCX", "XLSX"]) {
      expect(answer, token).toContain(token);
    }
  });

  it("states the company name as an argument, never as text", () => {
    const { answer } = catalogue.items.registered;
    expect(answer).toContain("{legalName}");
    expect(answer).toContain("{legalNameZh}");
    expect(answer).not.toMatch(/GUANGXI SHAHEEN|广西沙欣斯凯/);
  });
});

describe("faq messages (all locales)", () => {
  it("links the registered facts to the company page and the process to the trade process page", () => {
    for (const locale of LOCALES) {
      const { items } = CATALOGUE[locale];
      expect(items.registered.answer, locale).toContain("<company>");
      expect(items.location.answer, locale).toContain("<company>");
      expect(items.submit.answer, locale).toContain("<inquiry>");
      expect(items.contact.answer, locale).toMatch(/<contact>[^]*<inquiry>|<inquiry>[^]*<contact>/);
      expect(items.categories.answer, locale).toContain("<products>");
      expect(items.process.answer, locale).toContain("<process>");
    }
  });
});
