import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { COMPANY } from "@/config/company";
import arCompanyInfo from "@/messages/ar/companyInfo.json";
import arCommon from "@/messages/ar/common.json";
import enCompanyInfo from "@/messages/en/companyInfo.json";
import enCommon from "@/messages/en/common.json";
import zhCompanyInfo from "@/messages/zh/companyInfo.json";
import zhCommon from "@/messages/zh/common.json";
import { LOCALE_LIST, renderServer } from "./test-utils";
import { VerifyRegistration } from "./VerifyRegistration";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

const INFO = { en: enCompanyInfo, zh: zhCompanyInfo, ar: arCompanyInfo };
const COMMON = { en: enCommon, zh: zhCommon, ar: arCommon };

describe.each(LOCALE_LIST)("VerifyRegistration (%s)", (locale) => {
  const copy = INFO[locale].license.verify;

  it("explains the check in three steps", async () => {
    const { container } = await renderServer(<VerifyRegistration locale={locale} />, locale);

    expect(screen.getByRole("heading", { level: 3, name: copy.title })).toBeInTheDocument();
    expect(container.querySelectorAll("ol > li")).toHaveLength(3);
  });

  it("sends the reader to the official system in a new tab, without leaking the opener", async () => {
    await renderServer(<VerifyRegistration locale={locale} />, locale);

    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === COMPANY.verificationSystem.url);
    expect(links).toHaveLength(2); // the name in the first step, and the button
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("rel")).toContain("noreferrer");
      expect(link).toHaveTextContent(COMMON[locale].a11y.opensInNewTab);
    }
    expect(screen.getByRole("link", { name: new RegExp(copy.action) })).toBeInTheDocument();
  });

  it("names the system in Chinese, as the license prints it", async () => {
    await renderServer(<VerifyRegistration locale={locale} />, locale);

    const name = screen.getAllByText(COMPANY.verificationSystem.name)[0];
    expect(name).toHaveAttribute("lang", "zh-CN");
  });

  it("invites corrections through the contact page", async () => {
    await renderServer(<VerifyRegistration locale={locale} />, locale);

    const steps = screen.getAllByRole("listitem");
    const last = steps[steps.length - 1] as HTMLElement;
    expect(within(last).getByRole("link")).toHaveAttribute("href", `/${locale}/contact`);
  });

  it("reminds the reader that the image is only a copy", async () => {
    await renderServer(<VerifyRegistration locale={locale} />, locale);

    expect(screen.getByText(INFO[locale].license.copyNote)).toBeInTheDocument();
  });
});
