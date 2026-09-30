// @vitest-environment node
import { LOCALES, type Locale } from "@/i18n/locales";
import arLegal from "@/messages/ar/legal.json";
import enLegal from "@/messages/en/legal.json";
import zhLegal from "@/messages/zh/legal.json";
import { LEGAL_DOCS, type LegalDocKey } from "./legal-outline";

const CATALOGUE: Record<Locale, typeof enLegal> = { en: enLegal, zh: zhLegal, ar: arLegal };
const DOCS = Object.keys(LEGAL_DOCS) as LegalDocKey[];

/** The tags and arguments legal-tags.tsx and LegalPage supply. Any other one would fail at render time. */
const KNOWN_TAGS = ["company", "contact", "cookies", "privacy", "terms", "en", "zh", "tbc", "time"];
const KNOWN_ARGUMENTS = ["legalName", "legalNameZh", "address", "date"];

type Tree = { [key: string]: string | Tree };

/** Every string leaf with its dotted path, in document order. */
function leaves(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [[`${prefix}${key}`, value]] : leaves(value, `${prefix}${key}.`),
  );
}

/** The object keys of a tree, in order, as dotted paths: two locales must list the same sequence. */
function keyOrder(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => [
    `${prefix}${key}`,
    ...(typeof value === "string" ? [] : keyOrder(value, `${prefix}${key}.`)),
  ]);
}

const asTree = (value: unknown) => value as Tree;
const sectionsOf = (locale: Locale, doc: LegalDocKey) =>
  asTree(CATALOGUE[locale][doc].sections) as Record<string, Tree>;
const text = (tree: unknown) => leaves(asTree(tree));

const placeholdersIn = (message: string) =>
  [...message.matchAll(/<tbc>([^]*?)<\/tbc>/g)].map((match) => match[1] ?? "");
const countPlaceholders = (tree: unknown) =>
  text(tree).flatMap(([, message]) => placeholdersIn(message)).length;

// The brief: no named statutes, no invented retention periods.
const NAMED_LAWS =
  /GDPR|General Data Protection|CCPA|PIPL|PDPA|Data Protection Act|Cybersecurity Law|Civil Code|个人信息保护法|数据安全法|网络安全法|民法典|اللائحة العامة لحماية البيانات/i;
const RETENTION_PERIOD =
  /\b\d+\s*(?:days?|weeks?|months?|years?)\b|\d+\s*(?:天|日|周|个月|年)|\d+\s*(?:يومًا|أيام|أسابيع|أشهر|شهرًا|سنة|سنوات)/i;

describe.each(LOCALES)("legal messages (%s)", (locale) => {
  const catalogue = CATALOGUE[locale];

  it("lists the same sections and blocks, in the same order, as English", () => {
    for (const doc of DOCS) {
      expect(keyOrder(sectionsOf(locale, doc)), doc).toEqual(keyOrder(sectionsOf("en", doc)));
    }
    expect(keyOrder(asTree(catalogue))).toEqual(keyOrder(asTree(enLegal)));
  });

  it("starts every section with a title and has only paragraphs and lists after it", () => {
    for (const doc of DOCS) {
      for (const [id, section] of Object.entries(sectionsOf(locale, doc))) {
        const [first, ...rest] = Object.entries(section);
        expect(first?.[0], `${doc}.${id}`).toBe("title");
        expect(typeof first?.[1], `${doc}.${id}.title`).toBe("string");
        for (const [name, block] of rest) {
          const isParagraph = typeof block === "string";
          const isList =
            !isParagraph && Object.values(block).every((item) => typeof item === "string");
          expect(isParagraph || isList, `${doc}.${id}.${name}`).toBe(true);
        }
      }
    }
  });

  it("uses only tags and arguments the page supplies, and closes every tag", () => {
    for (const [path, message] of text(catalogue)) {
      const tags = [...message.matchAll(/<\/?([A-Za-z]+)>/g)].map((match) => match[1] ?? "");
      expect(
        tags.filter((tag) => !KNOWN_TAGS.includes(tag)),
        path,
      ).toEqual([]);
      expect(message.match(/<[A-Za-z]+>/g)?.length ?? 0, path).toBe(
        message.match(/<\/[A-Za-z]+>/g)?.length ?? 0,
      );
      const names = [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "");
      expect(
        names.filter((name) => !KNOWN_ARGUMENTS.includes(name)),
        path,
      ).toEqual([]);
    }
  });

  it("leaves decisions as bracketed placeholders in every document", () => {
    for (const doc of DOCS) {
      const found = text(catalogue[doc]).flatMap(([, message]) => placeholdersIn(message));
      expect(found.length, doc).toBeGreaterThan(0);
      for (const placeholder of found) {
        expect(placeholder, doc).toMatch(/^\[[^[\]]+\]$/);
      }
    }
  });

  it("has as many placeholders as English in every section", () => {
    for (const doc of DOCS) {
      for (const [id, section] of Object.entries(sectionsOf(locale, doc))) {
        expect(countPlaceholders(section), `${doc}.${id}`).toBe(
          countPlaceholders(sectionsOf("en", doc)[id]),
        );
      }
    }
  });

  it("holds no unresolved TODO, TBD or FIXME", () => {
    const unresolved = text(catalogue).filter(([, message]) =>
      /\b(TODO|TBD|FIXME|lorem)\b/i.test(message),
    );
    expect(unresolved).toEqual([]);
  });

  it("cites no named statute and invents no retention period", () => {
    const documents = text({ privacy: catalogue.privacy, terms: catalogue.terms });
    expect(documents.filter(([, message]) => NAMED_LAWS.test(message))).toEqual([]);
    expect(documents.filter(([, message]) => RETENTION_PERIOD.test(message))).toEqual([]);
  });

  it("explains the square-bracket convention in the review notice", () => {
    expect(catalogue.review.body).toMatch(/\[.+\]/);
  });

  it("gives each document a valid ISO last-updated date, the same in every language", () => {
    for (const doc of DOCS) {
      const iso = catalogue.updated[doc];
      expect(iso, doc).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${iso}T00:00:00Z`).toISOString().startsWith(iso), doc).toBe(true);
      expect(iso, doc).toBe(enLegal.updated[doc]);
    }
  });
});

describe("legal messages: what each document says", () => {
  it("names the controller through the registered details, never as typed text", () => {
    for (const locale of LOCALES) {
      const controller = sectionsOf(locale, "privacy").controller as Record<string, string>;
      expect(controller.p1, locale).toContain("{legalName}");
      expect(controller.p1, locale).toContain("{legalNameZh}");
      expect(controller.p2, locale).toContain("{address}");
    }
  });

  it("covers the topics the brief lists in the privacy policy", () => {
    expect(Object.keys(sectionsOf("en", "privacy"))).toEqual(
      expect.arrayContaining([
        "controller",
        "collected",
        "purposes",
        "storage",
        "sharing",
        "analytics",
        "rights",
        "security",
        "children",
        "changes",
        "contact",
      ]),
    );
  });

  it("covers the topics the brief lists in the terms", () => {
    expect(Object.keys(sectionsOf("en", "terms"))).toEqual(
      expect.arrayContaining([
        "use",
        "nature",
        "accuracy",
        "inquiries",
        "availability",
        "ip",
        "links",
        "liability",
        "law",
        "changes",
      ]),
    );
  });

  it("leaves liability, governing law and venue as placeholders in every language", () => {
    for (const locale of LOCALES) {
      const terms = sectionsOf(locale, "terms");
      expect(countPlaceholders(terms.liability), `${locale} liability`).toBeGreaterThan(0);
      const law = terms.law as Record<string, string>;
      expect(placeholdersIn(law.p1 ?? ""), `${locale} law`).toHaveLength(1);
      expect(placeholdersIn(law.p2 ?? ""), `${locale} venue`).toHaveLength(1);
    }
  });

  it("states that data is not sold and that no advertising trackers are used", () => {
    const sharing = sectionsOf("en", "privacy").sharing as Record<string, string>;
    expect(sharing.p1).toMatch(/do not sell/i);
    expect(sharing.p1).toMatch(/advertising trackers/i);
  });

  it("states that an inquiry is not an offer or a contract", () => {
    const inquiries = sectionsOf("en", "terms").inquiries as Record<string, string>;
    expect(inquiries.p1).toMatch(/not an offer[^]*contract/i);
  });

  it("lists in the cookie policy exactly the two cookies, and no advertising or analytics cookie", () => {
    const { rows } = enLegal.cookies.table;
    expect(Object.keys(rows)).toEqual(["language", "session"]);
    expect(rows.session.setFor).toMatch(/administrators only/i);
    expect(rows.session.setFor).toMatch(/never set for visitors/i);
    const notUsed = sectionsOf("en", "cookies")["not-used"] as Record<string, unknown>;
    expect(JSON.stringify(notUsed)).toMatch(/advertising[^]*analytics cookies/i);
  });
});

describe("legal messages: language of the copy", () => {
  it("writes Chinese with full-width punctuation next to Chinese characters", () => {
    const wrong = /\p{Script=Han}[,.;:?!()]|[,.;:?!()]\p{Script=Han}/u;
    const offending = text(zhLegal).filter(([, message]) =>
      wrong.test(message.replace(/<[^>]+>/g, "")),
    );
    expect(offending).toEqual([]);
  });

  it("writes Arabic with Arabic punctuation next to Arabic letters", () => {
    const wrong = /\p{Script=Arabic}[,;?]|[,;?]\p{Script=Arabic}/u;
    const offending = text(arLegal).filter(([, message]) =>
      wrong.test(message.replace(/<[^>]+>/g, "")),
    );
    expect(offending).toEqual([]);
  });

  it("does not glue an Arabic prefix letter to a Latin word", () => {
    const offending = text(arLegal).filter(([, message]) =>
      /(?:^|\s)[وفبلك][A-Za-z]/u.test(message),
    );
    expect(offending).toEqual([]);
  });
});
