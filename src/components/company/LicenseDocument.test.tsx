import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { COMPANY, LICENSE_IMAGE } from "@/config/company";
import arCompanyInfo from "@/messages/ar/companyInfo.json";
import enCompanyInfo from "@/messages/en/companyInfo.json";
import zhCompanyInfo from "@/messages/zh/companyInfo.json";
import { formatLongDate } from "./format";
import { LicenseDocument } from "./LicenseDocument";
import { LOCALE_LIST, renderServer } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
vi.mock("@/lib/analytics/track", () => ({ trackEvent: vi.fn() }));

const INFO = { en: enCompanyInfo, zh: zhCompanyInfo, ar: arCompanyInfo };

describe.each(LOCALE_LIST)("LicenseDocument (%s)", (locale) => {
  const viewer = INFO[locale].license.viewer;

  it("shows the license image with its description in the reader's language", async () => {
    await renderServer(<LicenseDocument locale={locale} />, locale);

    const image = screen.getByRole("img", { name: viewer.previewAlt });
    expect(image.getAttribute("src")).toContain(encodeURIComponent(LICENSE_IMAGE.src));
    expect(screen.getByRole("button", { name: viewer.viewFullSize })).toBeInTheDocument();
  });

  it("captions it as a copy, with the Chinese title and the issue date", async () => {
    await renderServer(<LicenseDocument locale={locale} />, locale);

    const caption = screen.getByRole("figure").querySelector("figcaption") as HTMLElement;
    expect(caption).toHaveTextContent(COMPANY.licenseTitleZh);
    expect(caption).toHaveTextContent(formatLongDate(COMPANY.licenseIssuedOn, locale));
    expect(screen.getByText(COMPANY.licenseTitleZh)).toHaveAttribute("lang", "zh-CN");
  });
});
