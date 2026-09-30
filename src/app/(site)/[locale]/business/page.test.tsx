import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  intlServerMock,
  MESSAGES,
  renderServer,
  resetNavigation,
} from "@/components/business/test-utils";
import { BUSINESS_SCOPE_ITEMS } from "@/config/business-scope";
import { CATEGORIES } from "@/content/categories";
import { TRADE_PROCESS_STEPS } from "@/content/process";
import { SERVICE_SLUGS, SERVICES } from "@/content/services";
import { LOCALES, type Locale } from "@/i18n/locales";
import { localizedUrl } from "@/lib/seo";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/business/test-utils")).navigationMock,
);
vi.mock(
  "next-intl/server",
  async () => (await import("@/components/business/test-utils")).intlServerMock,
);

import BusinessPage, { generateMetadata } from "./page";

const props = (locale: string) => ({ params: Promise.resolve({ locale }) }) as never;

async function renderIndex(locale: Locale = "en") {
  resetNavigation("/business", locale);
  return renderServer(await BusinessPage(props(locale)), locale);
}

const hrefs = (root: HTMLElement | Document = document) =>
  [...root.querySelectorAll("a")].map((link) => link.getAttribute("href"));

const sectionOf = (headingName: string | RegExp) =>
  screen.getByRole("heading", { level: 2, name: headingName }).closest("section") as HTMLElement;

beforeEach(() => {
  mocks.notFound.mockClear();
  intlServerMock.setRequestLocale.mockClear();
});

describe("/business", () => {
  it("has one h1 and fixes the request locale", async () => {
    await renderIndex();

    expect(intlServerMock.setRequestLocale).toHaveBeenCalledWith("en");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Trading and sourcing support for international buyers",
    );
    expect(document.querySelector("main")).toBeNull();
  });

  it("renders a card for each of the six lines, linked to its page under an h3", async () => {
    await renderIndex();

    const lines = sectionOf("Six ways we can help");
    const headings = within(lines).getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(
      SERVICE_SLUGS.map((slug) => MESSAGES.en.services[slug].name),
    );
    for (const [index, slug] of SERVICE_SLUGS.entries()) {
      expect(within(headings[index]!).getByRole("link")).toHaveAttribute(
        "href",
        `/en/business/${slug}`,
      );
    }
  });

  it("explains how the lines relate to the registered scope, with the registry as the table", async () => {
    await renderIndex();

    const relation = sectionOf("How the business lines relate to our registered scope");
    expect(
      within(relation).getByRole("link", { name: "See the registered business scope" }),
    ).toHaveAttribute("href", "/en/company-information");
    expect(within(relation).getByText(/The license lists no separate item for them/)).toBeVisible();

    const table = within(relation).getByRole("table", {
      name: "Registered scope items that each business line relates to",
    });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(SERVICES.length + 1);

    const referenced = BUSINESS_SCOPE_ITEMS.filter((item) =>
      SERVICES.some((service) => service.scopeItemIds.includes(item.id)),
    );
    expect(within(table).getAllByRole("columnheader")).toHaveLength(referenced.length + 1);

    for (const [index, service] of SERVICES.entries()) {
      const cells = within(rows[index + 1]!).getAllByRole("cell");
      expect(cells.map((cell) => cell.textContent)).toEqual(
        referenced.map((item) =>
          service.scopeItemIds.includes(item.id) ? "Related" : "–Not related",
        ),
      );
    }
  });

  it("teases the twelve product categories and links the product index", async () => {
    await renderIndex();

    const products = sectionOf("Product categories");
    expect(hrefs(products)).toEqual(
      expect.arrayContaining(CATEGORIES.map((category) => `/en/products/${category.slug}`)),
    );
    expect(hrefs(products)).toContain("/en/products");
    expect(
      within(products).getByText(/The registered scope covers 12 product categories/),
    ).toBeVisible();
    expect(within(products).getByText(/They are not a list of current stock/)).toBeVisible();
  });

  it("teases the typical trade process, labelled as typical, and links the full page", async () => {
    await renderIndex();

    const process = sectionOf("How a trade typically unfolds");
    expect(
      within(process)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(
      TRADE_PROCESS_STEPS.map(
        (step, index) => `${index + 1}${MESSAGES.en.business.index.process.steps[step]}`,
      ),
    );
    expect(within(process).getByText("Typical trade process")).toBeVisible();
    expect(
      within(process).getByRole("link", { name: "See the typical trade process" }),
    ).toHaveAttribute("href", "/en/global-trade/how-it-works");
  });

  it("closes with a call to action that leads to the inquiry form and the contact page", async () => {
    await renderIndex();

    const cta = sectionOf("Have a product or trade requirement?");
    expect(within(cta).getByRole("link", { name: /Send an inquiry/ })).toHaveAttribute(
      "href",
      "/en/inquiry",
    );
    expect(within(cta).getByRole("link", { name: "Contact us" })).toHaveAttribute(
      "href",
      "/en/contact",
    );
  });

  it("describes itself with a breadcrumb and a collection of the six lines", async () => {
    const { container } = await renderIndex();

    const data = [...container.querySelectorAll('script[type="application/ld+json"]')].flatMap(
      (script) => JSON.parse(script.textContent ?? "null") as Record<string, unknown>[],
    );
    expect(data.map((entry) => entry["@type"]).sort()).toEqual([
      "BreadcrumbList",
      "CollectionPage",
    ]);

    const collection = data.find((entry) => entry["@type"] === "CollectionPage") as {
      mainEntity: { itemListElement: { url: string }[] };
    };
    expect(collection.mainEntity.itemListElement.map((item) => item.url)).toEqual(
      SERVICE_SLUGS.map((slug) => localizedUrl("en", `/business/${slug}`)),
    );
  });

  it.each(LOCALES)("renders in %s with translated lines", async (locale) => {
    await renderIndex(locale);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const lines = sectionOf(MESSAGES[locale].business.index.lines.title);
    for (const slug of SERVICE_SLUGS) {
      expect(
        within(lines).getByRole("link", { name: MESSAGES[locale].services[slug].name }),
      ).toHaveAttribute("href", `/${locale}/business/${slug}`);
    }
  });
});

describe("/business metadata", () => {
  it("uses the business.meta copy, a canonical URL and one alternate per language", async () => {
    const metadata = await generateMetadata(props("en"));

    expect(metadata.title).toEqual({
      absolute: `${MESSAGES.en.business.meta.title} | Shaheen Sky`,
    });
    expect(metadata.description).toBe(MESSAGES.en.business.meta.description);
    expect(metadata.alternates?.canonical).toBe(localizedUrl("en", "/business"));
    expect(Object.keys(metadata.alternates?.languages ?? {}).sort()).toEqual(
      ["ar", "en", "x-default", "zh-CN"].sort(),
    );
  });

  it("renders the 404 for an unknown locale", async () => {
    await expect(generateMetadata(props("xx"))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(BusinessPage(props("xx"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
