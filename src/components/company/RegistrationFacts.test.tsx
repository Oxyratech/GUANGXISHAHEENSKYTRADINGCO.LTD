import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { COMPANY } from "@/config/company";
import arCompanyInfo from "@/messages/ar/companyInfo.json";
import enCompanyInfo from "@/messages/en/companyInfo.json";
import zhCompanyInfo from "@/messages/zh/companyInfo.json";
import { formatLongDate } from "./format";
import { RegistrationFacts } from "./RegistrationFacts";
import { LOCALE_LIST, renderServer } from "./test-utils";
import { getUnofficialTranslations } from "./unofficial-translations";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

const COPY = { en: enCompanyInfo, zh: zhCompanyInfo, ar: arCompanyInfo };

describe.each(LOCALE_LIST)("RegistrationFacts (%s)", (locale) => {
  const copy = COPY[locale];

  it("lists every registered value from COMPANY", async () => {
    const { container } = await renderServer(<RegistrationFacts locale={locale} />, locale);
    const text = container.textContent ?? "";

    for (const value of [
      COMPANY.legalNameEn,
      COMPANY.legalNameZh,
      COMPANY.companyTypeZh,
      COMPANY.legalRepresentative,
      COMPANY.registeredCapital.zh,
      COMPANY.registeredAddressZh,
      COMPANY.unifiedSocialCreditCode,
      COMPANY.registrationAuthorityZh,
      COMPANY.establishedOn,
      COMPANY.licenseIssuedOn,
      formatLongDate(COMPANY.establishedOn, locale),
      formatLongDate(COMPANY.licenseIssuedOn, locale),
    ]) {
      expect(text, value).toContain(value);
    }
  });

  it("states the registered capital as RMB 50,000, never five million", async () => {
    const { container } = await renderServer(<RegistrationFacts locale={locale} />, locale);
    const text = container.textContent ?? "";

    expect(text).toContain("RMB 50,000");
    expect(text).toContain("伍万人民币元整");
    expect(text).not.toMatch(/5,000,000|5000000|5 million/);
  });

  it("is a definition list with a term and a description for each of the ten facts", async () => {
    const { container } = await renderServer(<RegistrationFacts locale={locale} />, locale);

    const terms = [...container.querySelectorAll("dl > div > dt")].map((dt) => dt.textContent);
    expect(terms).toEqual([
      copy.facts.nameEn,
      copy.facts.nameZh,
      copy.facts.type,
      copy.facts.representative,
      copy.facts.capital,
      copy.facts.established,
      copy.facts.address,
      copy.facts.uscc,
      copy.facts.authority,
      copy.facts.issued,
    ]);
    expect(container.querySelectorAll("dl > div > dd")).toHaveLength(terms.length);
  });

  it("marks Chinese text as zh-CN and isolates Latin names for right-to-left text", async () => {
    await renderServer(<RegistrationFacts locale={locale} />, locale);

    for (const chinese of [
      COMPANY.legalNameZh,
      COMPANY.companyTypeZh,
      COMPANY.registeredAddressZh,
      COMPANY.registrationAuthorityZh,
      COMPANY.registeredCapital.zh,
    ]) {
      expect(screen.getByText(chinese)).toHaveAttribute("lang", "zh-CN");
    }
    for (const latin of [COMPANY.legalNameEn, COMPANY.legalRepresentative]) {
      const element = screen.getByText(latin);
      expect(element.tagName).toBe("BDI");
      expect(element).toHaveAttribute("dir", "ltr");
    }
  });

  it("gives the code in monospace, isolated, with a copy button", async () => {
    await renderServer(<RegistrationFacts locale={locale} />, locale);

    const code = screen.getByText(COMPANY.unifiedSocialCreditCode);
    expect(code).toHaveAttribute("dir", "ltr");
    expect(code).toHaveClass("font-mono");
    expect(screen.getByRole("button", { name: copy.facts.copy.label })).toBeInTheDocument();
  });

  it("pairs each date with its machine-readable form", async () => {
    const { container } = await renderServer(<RegistrationFacts locale={locale} />, locale);

    const dates = [...container.querySelectorAll("time")];
    expect(dates.map((time) => time.getAttribute("datetime"))).toEqual([
      COMPANY.establishedOn,
      COMPANY.licenseIssuedOn,
    ]);
    expect(dates[0]).toHaveTextContent(formatLongDate(COMPANY.establishedOn, locale));
  });
});

describe("RegistrationFacts translations", () => {
  it.each(["en", "ar"] as const)(
    "flags every rendering as unofficial next to the Chinese original (%s)",
    async (locale) => {
      await renderServer(<RegistrationFacts locale={locale} />, locale);
      const entries = getUnofficialTranslations(locale);

      expect(screen.getAllByText(COPY[locale].facts.unofficialTranslation)).toHaveLength(3);
      for (const text of Object.values(entries ?? {})) expect(screen.getByText(text)).toBeVisible();
    },
  );

  it("shows Chinese readers the original only", async () => {
    await renderServer(<RegistrationFacts locale="zh" />, "zh");

    expect(screen.queryByText(zhCompanyInfo.facts.unofficialTranslation)).not.toBeInTheDocument();
  });
});

describe("RegistrationFacts copy button", () => {
  it("copies the Unified Social Credit Code and announces it", async () => {
    const user = userEvent.setup();
    await renderServer(<RegistrationFacts locale="en" />, "en");
    const row = screen.getByText(enCompanyInfo.facts.uscc).closest("div") as HTMLElement;

    await user.click(within(row).getByRole("button", { name: "Copy code" }));

    expect(await navigator.clipboard.readText()).toBe(COMPANY.unifiedSocialCreditCode);
    expect(within(row).getByRole("status")).toHaveTextContent(enCompanyInfo.facts.copy.announce);
  });
});
