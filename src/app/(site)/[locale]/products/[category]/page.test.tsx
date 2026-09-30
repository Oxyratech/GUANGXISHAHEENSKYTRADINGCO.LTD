import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { makeSummary, renderServer, setTestLocale } from "@/components/products/test-utils";
import { CATEGORIES, CATEGORY_SLUGS } from "@/content/categories";
import { LOCALES } from "@/i18n/locales";
import {
  headingLevels,
  pageOf,
  readJsonLd,
  repository,
  resetRepository,
} from "../_lib/test-repository";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock(
  "next-intl/server",
  async () => (await import("@/components/products/test-utils")).intlServerMock,
);
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/products/test-utils")).navigationMock,
);
vi.mock("@/server/products", async () =>
  (await import("../_lib/test-repository")).repositoryMock(),
);

import CategoryPage, { dynamicParams, generateMetadata, generateStaticParams } from "./page";

type Props = PageProps<"/[locale]/products/[category]">;

const props = (
  category: string,
  locale = "en",
  searchParams: Record<string, string | string[]> = {},
) =>
  ({
    params: Promise.resolve({ locale, category }),
    searchParams: Promise.resolve(searchParams),
  }) as Props;

const products = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    makeSummary({
      slug: `item-${index + 1}`,
      name: `Item ${index + 1}`,
      categorySlug: "metal-products",
    }),
  );

beforeEach(() => {
  resetRepository();
});

describe("category route configuration", () => {
  it("is generated for exactly the twelve registered categories and 404s for any other slug", () => {
    expect(dynamicParams).toBe(false);
    expect(generateStaticParams()).toEqual(CATEGORY_SLUGS.map((category) => ({ category })));
    expect(generateStaticParams()).toHaveLength(12);
  });

  it("is a 404 for an unknown category, without reading the catalogue", async () => {
    await expect(CategoryPage(props("not-a-category"))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(generateMetadata(props("not-a-category"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(repository.listPublishedProducts).not.toHaveBeenCalled();
  });

  it("is a 404 for a locale the site does not have", async () => {
    await expect(CategoryPage(props("metal-products", "xx"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("category page", () => {
  it("has one h1 with the category name, the registered scope and no <main> of its own", async () => {
    const { container } = await renderServer(await CategoryPage(props("consumer-goods")));

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Consumer Goods" })).toBeInTheDocument();
    expect(container.querySelector("main")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: "Registered scope for this category" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sales of toys")).toBeInTheDocument();
    expect(screen.getByText(/not a list of current stock/)).toBeInTheDocument();
  });

  it("keeps the heading outline valid", async () => {
    const { container } = await renderServer(await CategoryPage(props("food-products")));
    const levels = headingLevels(container);
    levels.forEach((level, index) => {
      if (index > 0) expect(level).toBeLessThanOrEqual((levels[index - 1] ?? 0) + 1);
    });
  });

  it.each(CATEGORIES.map((category) => [category.slug, category.regulated] as const))(
    "%s: shows the regulated-goods note exactly when the category is regulated (%s)",
    async (slug, regulated) => {
      await renderServer(await CategoryPage(props(slug)));
      expect(screen.queryAllByText("Regulated goods")).toHaveLength(regulated ? 1 : 0);
    },
  );

  it("shows the empty state with a category inquiry link when nothing is published", async () => {
    await renderServer(await CategoryPage(props("metal-products")));

    expect(
      screen.getByRole("heading", {
        name: "No products have been published in this category yet.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Send an inquiry about this category" }),
    ).toHaveAttribute("href", "/en/inquiry?category=metal-products");
    expect(screen.queryByRole("navigation", { name: "Product pages" })).not.toBeInTheDocument();
  });

  it("shows the same empty state when the database is not configured", async () => {
    repository.listPublishedProducts.mockResolvedValue({ ok: false, cause: "not_configured" });
    await renderServer(await CategoryPage(props("metal-products")));
    expect(
      screen.getByText("No products have been published in this category yet."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("degrades to an honest unavailable state, keeping the rest of the page, when the database is down", async () => {
    repository.listPublishedProducts.mockResolvedValue({ ok: false, cause: "timeout" });
    await renderServer(await CategoryPage(props("metal-products")));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Product listings are unavailable right now",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Metal Products & Materials" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sales of metal products")).toBeInTheDocument();
  });

  it("asks the repository for this category's products, page by page", async () => {
    await renderServer(await CategoryPage(props("metal-products", "en", { page: "3" })));
    expect(repository.listPublishedProducts).toHaveBeenCalledWith({
      locale: "en",
      categorySlug: "metal-products",
      page: 3,
      pageSize: 12,
    });
  });

  it.each(["abc", "0", "-1", "1.5"])("treats ?page=%s as page 1", async (page) => {
    await renderServer(await CategoryPage(props("metal-products", "en", { page })));
    expect(repository.listPublishedProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 }),
    );
  });

  it("lists the products with a range summary and crawlable pagination", async () => {
    repository.listPublishedProducts.mockResolvedValue({
      ok: true,
      data: pageOf(products(12), { total: 30, page: 2, pageCount: 3 }),
    });

    await renderServer(await CategoryPage(props("metal-products", "en", { page: "2" })));

    expect(screen.getByText("Showing 13–24 of 30")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Item 1" })).toHaveAttribute(
      "href",
      "/en/products/metal-products/item-1",
    );
    const nav = screen.getByRole("navigation", { name: "Product pages" });
    expect(within(nav).getByRole("link", { name: "Page 1" })).toHaveAttribute(
      "href",
      "/en/products/metal-products",
    );
    expect(within(nav).getByRole("link", { name: "Page 3" })).toHaveAttribute(
      "href",
      "/en/products/metal-products?page=3",
    );
  });

  it("links a few neighbouring categories", async () => {
    const { container } = await renderServer(await CategoryPage(props("metal-products")));
    expect(container.querySelector('a[href="/en/products/minerals-ores"]')).not.toBeNull();
    expect(screen.getByRole("link", { name: /All product categories/ })).toHaveAttribute(
      "href",
      "/en/products",
    );
  });

  it("describes itself: breadcrumb always, a collection only when there are products", async () => {
    const empty = await renderServer(await CategoryPage(props("metal-products")));
    expect(readJsonLd(empty.container).map((entry) => entry["@type"])).toEqual(["BreadcrumbList"]);
    empty.unmount();

    repository.listPublishedProducts.mockResolvedValue({ ok: true, data: pageOf(products(2)) });
    const filled = await renderServer(await CategoryPage(props("metal-products")));
    const data = readJsonLd(filled.container);
    expect(data.map((entry) => entry["@type"])).toEqual(["BreadcrumbList", "CollectionPage"]);
    expect(data[0]).toMatchObject({
      itemListElement: [
        { name: "Home" },
        { name: "Products" },
        { name: "Metal Products & Materials" },
      ],
    });
  });

  it.each(LOCALES)("renders in %s", async (locale) => {
    setTestLocale(locale);
    for (const { slug } of CATEGORIES) {
      const { container, unmount } = await renderServer(await CategoryPage(props(slug, locale)));
      expect(within(container).getAllByRole("heading", { level: 1 })).toHaveLength(1);
      unmount();
    }
  });
});

describe("category metadata", () => {
  it("has a title, description and canonical with hreflang for every language", async () => {
    const metadata = await generateMetadata(props("metal-products"));

    expect(metadata.title).toMatchObject({
      absolute: "Metal Products & Materials sourcing and trade from China | Shaheen Sky",
    });
    expect(metadata.description).toMatch(
      /^Trade in metal products and metal materials\. .*not current stock/,
    );
    expect(metadata.alternates?.canonical).toMatch(/\/en\/products\/metal-products$/);
    expect(Object.keys(metadata.alternates?.languages ?? {})).toContain("zh-CN");
  });

  it("gives a later page its own canonical address and title, without language alternates", async () => {
    const metadata = await generateMetadata(props("metal-products", "en", { page: "2" }));

    expect(metadata.alternates?.canonical).toMatch(/\/en\/products\/metal-products\?page=2$/);
    expect(metadata.alternates).not.toHaveProperty("languages");
    expect(metadata.title).toMatchObject({ absolute: expect.stringContaining("page 2") });
  });

  it("honours an editor's override for the category", async () => {
    repository.getSeoOverride.mockResolvedValue({
      title: "Custom title",
      description: "Custom description.",
      noIndex: true,
      ogImage: { url: "/media/0a1b2c3d-0000-4000-8000-00000000000a", width: 1200, height: 630 },
    });

    const metadata = await generateMetadata(props("metal-products"));

    expect(repository.getSeoOverride).toHaveBeenCalledWith({
      scope: "CATEGORY",
      refKey: "metal-products",
      locale: "en",
    });
    expect(metadata.title).toMatchObject({ absolute: "Custom title | Shaheen Sky" });
    expect(metadata.description).toBe("Custom description.");
    expect(metadata.robots).toMatchObject({ index: false });
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: expect.stringContaining("/media/0a1b2c3d"), width: 1200 }),
    ]);
  });
});
