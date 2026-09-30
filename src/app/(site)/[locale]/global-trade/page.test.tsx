import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { STATIC_PUBLIC_PATHS } from "@/config/routes";
import { CATEGORY_SLUGS } from "@/content/categories";
import { SERVICE_SLUGS } from "@/content/services";
import { LOCALES, type Locale } from "@/i18n/locales";
import { localizedUrl } from "@/lib/seo";
import {
  hasValidOutline,
  headingLevels,
  internalPaths,
  jsonLdOf,
  MESSAGES,
  resolveServerTree,
} from "@/components/trade/test-utils";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/trade/test-utils")).navigationMock,
);
vi.mock(
  "next-intl/server",
  async () => (await import("@/components/trade/test-utils")).intlServerMock,
);

import GlobalTradePage, { generateMetadata } from "./page";

const KNOWN_PATHS = new Set<string>([
  ...STATIC_PUBLIC_PATHS,
  ...CATEGORY_SLUGS.map((slug) => `/products/${slug}`),
  ...SERVICE_SLUGS.map((slug) => `/business/${slug}`),
]);

async function renderPage(locale: Locale) {
  const tree = await GlobalTradePage({ params: Promise.resolve({ locale }) } as never);
  return render(await resolveServerTree(tree));
}

describe.each(LOCALES)("/global-trade in %s", (locale) => {
  const copy = MESSAGES[locale].globalTrade;

  it("has one h1, the page's own, and a heading outline that never skips a level", async () => {
    const { container } = await renderPage(locale);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(copy.overview.title);
    expect(hasValidOutline(headingLevels(container))).toBe(true);
  });

  it("leaves the <main> landmark to the layout", async () => {
    const { container } = await renderPage(locale);
    expect(container.querySelector("main")).toBeNull();
  });

  it("links only to pages that exist, under the locale prefix", async () => {
    const { container } = await renderPage(locale);

    const targets = internalPaths(container, locale);
    expect(targets.length).toBeGreaterThan(8);
    expect(targets.filter((path) => !KNOWN_PATHS.has(path))).toEqual([]);
    expect(targets).toEqual(
      expect.arrayContaining(["/inquiry", "/global-trade/how-it-works", "/business", "/faq"]),
    );
  });

  it("shows the sourcing brief with a strong way to the inquiry form", async () => {
    await renderPage(locale);

    const brief = screen.getByRole("region", { name: copy.overview.brief.title });
    expect(within(brief).getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(within(brief).getAllByRole("listitem")).toHaveLength(7);
    expect(
      within(brief).getByRole("link", { name: MESSAGES[locale].common.cta.submitTradeInquiry }),
    ).toHaveAttribute("href", `/${locale}/inquiry`);
  });

  it("embeds the compact typical process and links to the detailed one", async () => {
    await renderPage(locale);

    const process = screen.getByRole("list", { name: copy.process.label });
    expect(within(process).getAllByRole("listitem")).toHaveLength(8);
    expect(screen.getByRole("link", { name: copy.overview.process.cta })).toHaveAttribute(
      "href",
      `/${locale}/global-trade/how-it-works`,
    );
  });

  it("lists the documents that are typically involved and the caveat that requirements vary", async () => {
    await renderPage(locale);

    const documents = screen.getByRole("region", { name: copy.overview.documents.title });
    expect(within(documents).getAllByRole("term")).toHaveLength(5);
    expect(within(documents).getByText(copy.overview.documents.note)).toBeInTheDocument();
  });

  it("describes shipping as coordination and links compliance to the registered scope", async () => {
    await renderPage(locale);

    expect(screen.getByRole("region", { name: copy.overview.shipping.title })).toBeInTheDocument();
    const compliance = screen.getByRole("region", { name: copy.overview.compliance.title });
    expect(within(compliance).getByRole("link")).toHaveAttribute(
      "href",
      `/${locale}/company-information`,
    );
  });

  it("emits a BreadcrumbList and no HowTo", async () => {
    const { container } = await renderPage(locale);

    const data = jsonLdOf(container);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          position: 1,
          name: MESSAGES[locale].common.breadcrumb.home,
          item: localizedUrl(locale, "/"),
        },
        {
          position: 2,
          name: MESSAGES[locale].common.nav.globalTrade,
          item: localizedUrl(locale, "/global-trade"),
        },
      ],
    });
    expect(JSON.stringify(data)).not.toContain("HowTo");
  });

  it("publishes its metadata with canonical and language alternates", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) } as never);

    expect(metadata.description).toBe(copy.meta.description);
    expect(metadata.alternates?.canonical).toBe(localizedUrl(locale, "/global-trade"));
    expect(Object.keys(metadata.alternates?.languages ?? {})).toEqual(
      expect.arrayContaining(["en", "zh-CN", "ar", "x-default"]),
    );
  });
});

describe("/global-trade", () => {
  it("makes no claim about countries, volumes, partners or superlatives in English", async () => {
    const { container } = await renderPage("en");

    expect(container.textContent).not.toMatch(
      /\b(leading|leader|trusted|best|largest|premier|guarantee[ds]?|coming soon)\b/i,
    );
  });

  it("is a 404 for an unknown locale", async () => {
    await expect(
      GlobalTradePage({ params: Promise.resolve({ locale: "xx" }) } as never),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
