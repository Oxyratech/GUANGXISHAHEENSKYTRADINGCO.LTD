import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  headingLevels,
  internalPaths,
  jsonLdOf,
  LOCALE_LIST,
  renderServer,
} from "@/components/company/test-utils";
import { BUSINESS_SCOPE_ITEMS } from "@/config/business-scope";
import { COMPANY, LICENSE_IMAGE } from "@/config/company";
import { STATIC_PUBLIC_PATHS } from "@/config/routes";
import { CATEGORY_SLUGS } from "@/content/categories";
import arCommon from "@/messages/ar/common.json";
import arCompanyInfo from "@/messages/ar/companyInfo.json";
import enCommon from "@/messages/en/common.json";
import enCompanyInfo from "@/messages/en/companyInfo.json";
import zhCommon from "@/messages/zh/common.json";
import zhCompanyInfo from "@/messages/zh/companyInfo.json";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock(
  "next-intl/server",
  async () => (await import("@/components/company/test-utils")).intlServerMock,
);
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/company/test-utils")).navigationMock,
);
vi.mock("@/lib/analytics/track", () => ({ trackEvent: vi.fn() }));

import CompanyInformationPage, { generateMetadata } from "./page";

const INFO = { en: enCompanyInfo, zh: zhCompanyInfo, ar: arCompanyInfo };
const COMMON = { en: enCommon, zh: zhCommon, ar: arCommon };
const params = (locale: string) => ({ params: Promise.resolve({ locale }) }) as never;

const KNOWN_PATHS = new Set<string>([
  ...STATIC_PUBLIC_PATHS,
  ...CATEGORY_SLUGS.map((slug) => `/products/${slug}`),
]);

beforeEach(() => {
  mocks.notFound.mockClear();
});

describe("Company information page metadata", () => {
  it.each(LOCALE_LIST)(
    "has a title, description, canonical and alternates in %s",
    async (locale) => {
      const metadata = await generateMetadata(params(locale));

      expect(metadata.title).toEqual({ absolute: `${INFO[locale].meta.title} | Shaheen Sky` });
      expect(metadata.description).toContain(COMPANY.legalNameZh);
      expect(metadata.alternates?.canonical).toMatch(new RegExp(`/${locale}/company-information$`));
      expect(Object.keys(metadata.alternates?.languages ?? {}).sort()).toEqual(
        ["ar", "en", "x-default", "zh-CN"].sort(),
      );
    },
  );

  it("renders the 404 for an unknown locale", async () => {
    await expect(CompanyInformationPage(params("fr"))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(generateMetadata(params("fr"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe.each(LOCALE_LIST)("Company information page (%s)", (locale) => {
  const copy = INFO[locale];

  async function renderPage() {
    return renderServer(await CompanyInformationPage(params(locale)), locale);
  }

  it("has one h1 and an unbroken heading outline, and never its own <main>", async () => {
    const { container } = await renderPage();

    const levels = headingLevels(container);
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    levels.forEach((level, index) => {
      if (index > 0)
        expect(level, `heading ${index}`).toBeLessThanOrEqual((levels[index - 1] ?? 0) + 1);
    });
    expect(container.querySelector("main")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(copy.hero.title);
  });

  it("has the three sections in order, each a named region the top links point at", async () => {
    const { container } = await renderPage();

    const nav = screen.getByRole("navigation", { name: copy.hero.onThisPage });
    const targets = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(targets).toEqual(["#registration", "#business-license", "#business-scope"]);
    const regions = targets.map((href) => container.querySelector(href ?? ""));
    for (const region of regions) expect(region).not.toBeNull();
    expect(regions.map((region) => region?.tagName)).toEqual(["SECTION", "SECTION", "SECTION"]);
    expect(regions.map((region) => region?.getAttribute("aria-labelledby")).every(Boolean)).toBe(
      true,
    );
  });

  it("gives the registration facts", async () => {
    const { container } = await renderPage();
    const text = container.textContent ?? "";

    expect(text).toContain(COMPANY.unifiedSocialCreditCode);
  });

  it("shows the license as an image with a way to open it full size", async () => {
    await renderPage();

    const figure = screen.getByRole("figure");
    expect(
      within(figure).getByRole("img", { name: copy.license.viewer.previewAlt }),
    ).toBeInTheDocument();
    expect(
      within(figure).getByRole("button", { name: copy.license.viewer.viewFullSize }),
    ).toBeInTheDocument();
    expect(
      within(figure)
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === LICENSE_IMAGE.src),
    ).toBe(true);
  });

  it("lists all 40 registered scope items in the scope section", async () => {
    await renderPage();

    const scope = document.getElementById("business-scope") as HTMLElement;
    const lists = within(scope).getAllByRole("list");
    const items = lists.flatMap((list) => within(list).getAllByRole("listitem"));
    expect(items).toHaveLength(BUSINESS_SCOPE_ITEMS.length);
  });

  it("opens exactly one link to another site, the official register, safely in a new tab", async () => {
    await renderPage();

    const external = [...document.querySelectorAll<HTMLAnchorElement>("a[href^='http']")];
    expect(external.length).toBeGreaterThan(0);
    for (const link of external) {
      expect(link.getAttribute("href")).toBe(COMPANY.verificationSystem.url);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("rel")).toContain("noreferrer");
    }
    const newTab = [...document.querySelectorAll<HTMLAnchorElement>("a[target='_blank']")];
    for (const link of newTab) expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("links only to pages that exist", async () => {
    await renderPage();

    const paths = internalPaths(document.body, locale);
    for (const path of paths) expect(KNOWN_PATHS.has(path), path).toBe(true);
    expect(paths).toContain("/products");
    expect(paths).toContain("/inquiry");
  });

  it("describes itself to search engines and to the trail of pages that led to it", async () => {
    const { container } = await renderPage();

    const data = jsonLdOf(container);
    expect(data.map((entry) => entry["@type"])).toEqual(["BreadcrumbList", "WebPage"]);
    expect(data[1]?.url).toMatch(new RegExp(`/${locale}/company-information$`));
    expect(
      within(screen.getByRole("navigation", { name: COMMON[locale].a11y.breadcrumb })).getByText(
        COMMON[locale].nav.companyInformation,
      ),
    ).toHaveAttribute("aria-current", "page");
  });

  it("makes no promise about the license beyond what it shows", async () => {
    const { container } = await renderPage();
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/\b(verified by us|guarantee[ds]?|certified|coming soon)\b/i);
    expect(screen.getByText(copy.license.copyNote)).toBeInTheDocument();
  });
});
