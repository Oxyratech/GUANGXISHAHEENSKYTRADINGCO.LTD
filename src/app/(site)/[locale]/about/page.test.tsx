import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  headingLevels,
  internalPaths,
  jsonLdOf,
  LOCALE_LIST,
  renderServer,
} from "@/components/company/test-utils";
import { formatLongDate, formatRegisteredCapital } from "@/components/company/format";
import { BUSINESS_SCOPE_ITEMS, SCOPE_GROUPS } from "@/config/business-scope";
import { COMPANY } from "@/config/company";
import { STATIC_PUBLIC_PATHS } from "@/config/routes";
import { CATEGORY_SLUGS } from "@/content/categories";
import { SERVICE_SLUGS } from "@/content/services";
import type { Locale } from "@/i18n/locales";
import arAbout from "@/messages/ar/about.json";
import arCommon from "@/messages/ar/common.json";
import enAbout from "@/messages/en/about.json";
import enCommon from "@/messages/en/common.json";
import zhAbout from "@/messages/zh/about.json";
import zhCommon from "@/messages/zh/common.json";

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

import AboutPage, { generateMetadata } from "./page";

const ABOUT = { en: enAbout, zh: zhAbout, ar: arAbout };
const COMMON = { en: enCommon, zh: zhCommon, ar: arCommon };
const params = (locale: string) => ({ params: Promise.resolve({ locale }) }) as never;

const KNOWN_PATHS = new Set<string>([
  ...STATIC_PUBLIC_PATHS,
  ...CATEGORY_SLUGS.map((slug) => `/products/${slug}`),
]);

// Claims the company cannot make (docs/ARCHITECTURE.md section 9).
const UNSUPPORTED: Record<Locale, RegExp> = {
  en: /\b(leading|leader|trusted|best|largest|premier|world-class|guarantee[ds]?|coming soon)\b/i,
  zh: /领先|领导者|最佳|最优|最大|最好|保证|担保|值得信赖|首屈一指|敬请期待/,
  ar: /رائد|أفضل|أكبر|نضمن|ضمان|مضمون|موثوق|قريبًا/,
};

beforeEach(() => {
  mocks.notFound.mockClear();
});

describe("About page metadata", () => {
  it.each(LOCALE_LIST)(
    "has a title, description, canonical and alternates in %s",
    async (locale) => {
      const metadata = await generateMetadata(params(locale));

      expect(metadata.title).toEqual({ absolute: `${ABOUT[locale].meta.title} | Shaheen Sky` });
      expect(metadata.description).toContain(COMPANY.legalNameZh);
      expect(metadata.alternates?.canonical).toMatch(new RegExp(`/${locale}/about$`));
      expect(Object.keys(metadata.alternates?.languages ?? {}).sort()).toEqual(
        ["ar", "en", "x-default", "zh-CN"].sort(),
      );
    },
  );

  it("names the place of registration in the description without inventing more", async () => {
    const metadata = await generateMetadata(params("en"));

    expect(metadata.description).toContain("Nanning, Guangxi, China");
    expect(metadata.description).not.toMatch(UNSUPPORTED.en);
  });

  it("renders the 404 for an unknown locale", async () => {
    await expect(AboutPage(params("fr"))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(generateMetadata(params("fr"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe.each(LOCALE_LIST)("About page (%s)", (locale) => {
  const copy = ABOUT[locale];

  async function renderPage() {
    return renderServer(await AboutPage(params(locale)), locale);
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

  it("tells the story in the planned order", async () => {
    await renderPage();

    const sections = [
      copy.overview.title,
      copy.focus.title,
      copy.registered.title,
      copy.scope.title,
      copy.approach.title,
      copy.vision.title,
      copy.cta.title,
    ];
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings.filter((text) => sections.includes(text ?? ""))).toEqual(sections);
  });

  it("states the registration facts from the license", async () => {
    const { container } = await renderPage();
    const text = container.textContent ?? "";

    expect(text).toContain(formatLongDate(COMPANY.establishedOn, locale));
    expect(text).toContain(copy.location);
    expect(text).toContain(formatRegisteredCapital());
    expect(text).toContain(COMPANY.legalNameZh);
    expect(text).toContain(COMPANY.legalNameEn);
    expect(text).not.toMatch(/5,000,000|5000000/);
  });

  it("isolates the Latin legal name for right-to-left reading", async () => {
    await renderPage();

    const name = screen.getAllByText(COMPANY.legalNameEn)[0];
    expect(name?.tagName).toBe("BDI");
    expect(name).toHaveAttribute("dir", "ltr");
    expect(screen.getAllByText(COMPANY.legalNameZh)[0]).toHaveAttribute("lang", "zh-CN");
  });

  it("lists the six lines of work, each with its own page", async () => {
    await renderPage();

    const paths = internalPaths(document.body, locale);
    for (const slug of SERVICE_SLUGS) expect(paths).toContain(`/business/${slug}`);
  });

  it("summarizes all 13 scope groups and the 40 registered items", async () => {
    await renderPage();
    const scope = screen.getByRole("region", { name: copy.scope.title });

    expect(within(scope).getAllByRole("heading", { level: 3 })).toHaveLength(SCOPE_GROUPS.length);
    expect(scope).toHaveTextContent(String(BUSINESS_SCOPE_ITEMS.length));
  });

  it("frames the approach as intent and the vision as a direction", async () => {
    await renderPage();
    const approach = screen.getByRole("region", { name: copy.approach.title });

    expect(within(approach).getAllByRole("heading", { level: 3 })).toHaveLength(4);
    expect(within(approach).getByText(copy.approach.note)).toBeInTheDocument();
    expect(screen.getByText(copy.vision.mapCaption)).toBeInTheDocument();
  });

  it("links only to pages that exist, and sends the reader to the inquiry form twice", async () => {
    await renderPage();

    const paths = internalPaths(document.body, locale);
    for (const path of paths) expect(KNOWN_PATHS.has(path), path).toBe(true);
    expect(paths.filter((path) => path === "/inquiry")).toHaveLength(2);
    expect(paths).toContain("/company-information");
    expect(paths).toContain("/global-trade/how-it-works");
    expect(document.querySelectorAll("a[href^='http']")).toHaveLength(0);
  });

  it("makes no claim the company cannot back up", async () => {
    const { container } = await renderPage();
    const text = container.textContent ?? "";

    expect(text).not.toMatch(UNSUPPORTED[locale]);
    expect(text).not.toMatch(
      /\b(employees|staff of|years of experience|clients?|customers? in)\b/i,
    );
  });

  it("describes itself to search engines as the about page of this organization", async () => {
    const { container } = await renderPage();

    const data = jsonLdOf(container);
    expect(data.map((entry) => entry["@type"])).toEqual(["BreadcrumbList", "AboutPage"]);
    const breadcrumb = data[0]?.itemListElement as { name: string; item: string }[];
    expect(breadcrumb.map((item) => item.item)).toEqual([
      expect.stringMatching(new RegExp(`/${locale}$`)),
      expect.stringMatching(new RegExp(`/${locale}/about$`)),
    ]);
    expect(data[1]?.inLanguage).toBe(locale === "zh" ? "zh-CN" : locale);
  });

  it("has a breadcrumb that ends on the current page", async () => {
    await renderPage();

    const trail = screen.getByRole("navigation", { name: COMMON[locale].a11y.breadcrumb });
    expect(within(trail).getAllByRole("listitem")).toHaveLength(2);
    expect(within(trail).getByText(COMMON[locale].nav.about)).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
