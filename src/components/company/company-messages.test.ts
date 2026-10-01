// @vitest-environment node
import { describe, expect, it } from "vitest";
import { COMPANY } from "@/config/company";
import { LOCALES, type Locale } from "@/i18n/locales";
import arAbout from "@/messages/ar/about.json";
import arCompanyInfo from "@/messages/ar/companyInfo.json";
import enAbout from "@/messages/en/about.json";
import enCompanyInfo from "@/messages/en/companyInfo.json";
import zhAbout from "@/messages/zh/about.json";
import zhCompanyInfo from "@/messages/zh/companyInfo.json";

/**
 * The about and companyInfo copy must stay true to docs/ARCHITECTURE.md sections 3, 4 and 9:
 * company facts come from src/config/company.ts and are never retyped here, and nothing claims
 * what the company does not have.
 */
const MESSAGES = {
  about: { en: enAbout, zh: zhAbout, ar: arAbout },
  companyInfo: { en: enCompanyInfo, zh: zhCompanyInfo, ar: arCompanyInfo },
} as const;

function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    strings(child, path === "" ? key : `${path}.${key}`),
  );
}

const ALL = (Object.keys(MESSAGES) as (keyof typeof MESSAGES)[]).flatMap((namespace) =>
  LOCALES.flatMap((locale) =>
    strings(MESSAGES[namespace][locale]).map(([path, text]) => ({
      where: `${locale}/${namespace}.json ${path}`,
      locale,
      text,
    })),
  ),
);

const UNSUPPORTED: Record<Locale, RegExp> = {
  en: /\b(leading|leader|trusted|best|largest|premier|world-class|guarantee[ds]?|coming soon)\b/i,
  zh: /领先|领导者|最佳|最优|最大|最好|保证|担保|值得信赖|首屈一指|敬请期待/,
  ar: /رائد|أفضل|أكبر|نضمن|ضمان|مضمون|موثوق|قريبًا/,
};

describe("company messages", () => {
  it("reads all the strings it checks", () => {
    expect(ALL.length).toBeGreaterThan(200);
  });

  it("never retype a registered fact: names, code, dates and address come from COMPANY", () => {
    const facts = [
      COMPANY.legalNameEn,
      COMPANY.legalNameZh,
      COMPANY.legalRepresentative,
      COMPANY.unifiedSocialCreditCode,
      COMPANY.registeredAddressZh,
      COMPANY.registrationAuthorityZh,
      COMPANY.companyTypeZh,
      COMPANY.establishedOn,
      "2026",
    ].map((fact) => fact.toLowerCase());

    const retyped = ALL.filter(({ text }) =>
      facts.some((fact) => text.toLowerCase().includes(fact)),
    ).map(({ where }) => where);
    expect(retyped).toEqual([]);
  });

  it("carries no figure of its own: counts and dates arrive as values", () => {
    const withDigits = ALL.filter(({ text }) =>
      /\d/.test(text.replace(/\{[^}]*\}/g, "").replace(/<\/?\w+>/g, "")),
    ).map(({ where }) => where);
    expect(withDigits).toEqual([]);
  });

  it("makes no claim of leadership, guarantee or availability", () => {
    const claims = ALL.filter(({ locale, text }) => UNSUPPORTED[locale].test(text)).map(
      ({ where, text }) => `${where}: ${text}`,
    );
    expect(claims).toEqual([]);
  });

  it("gives Arabic and Chinese place names that match the registered location", () => {
    const { cityEn, regionEn, countryEn } = COMPANY.location;
    for (const part of [cityEn, regionEn, countryEn]) expect(enAbout.location).toContain(part);
    expect(zhAbout.location).toContain("广西");
    expect(zhAbout.location).toContain("南宁");
    expect(arAbout.location).toMatch(/\p{Script=Arabic}/u);
  });
});
