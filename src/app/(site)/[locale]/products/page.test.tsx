import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  makeImage,
  makeSummary,
  renderServer,
  setTestLocale,
} from "@/components/products/test-utils";
import { CATEGORY_SLUGS } from "@/content/categories";
import { LOCALES } from "@/i18n/locales";
import {
  headingLevels,
  noCounts,
  pageOf,
  readJsonLd,
  repository,
  resetRepository,
} from "./_lib/test-repository";

const mocks = vi.hoisted(() => ({ connection: vi.fn() }));

vi.mock("next/server", () => ({ connection: mocks.connection }));
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
vi.mock("@/server/products", async () => (await import("./_lib/test-repository")).repositoryMock());

import ProductsPage, { generateMetadata } from "./page";

const props = (locale: string) =>
  ({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve({}),
  }) as PageProps<"/[locale]/products">;

beforeEach(() => {
  resetRepository();
  mocks.connection.mockReset().mockResolvedValue(undefined);
});

describe("/products", () => {
  it("has one h1, the twelve category cards, the availability note and no <main> of its own", async () => {
    const { container } = await renderServer(await ProductsPage(props("en")));

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelector("main")).toBeNull();
    for (const slug of CATEGORY_SLUGS) {
      expect(container.querySelector(`a[href="/en/products/${slug}"]`)).not.toBeNull();
    }
    expect(screen.getByText(/They are not a list of current stock/)).toBeInTheDocument();
  });

  it("keeps the heading outline valid: no level is skipped", async () => {
    const { container } = await renderServer(await ProductsPage(props("en")));
    const levels = headingLevels(container);
    levels.forEach((level, index) => {
      if (index > 0) expect(level).toBeLessThanOrEqual((levels[index - 1] ?? 0) + 1);
    });
  });

  it("explains that products are sourced against requirements when none is published", async () => {
    await renderServer(await ProductsPage(props("en")));

    expect(
      screen.getByRole("heading", { name: "No products have been published yet." }),
    ).toBeInTheDocument();
    const cta = screen.getAllByRole("link", { name: "Send inquiry" });
    expect(cta.length).toBeGreaterThanOrEqual(2);
    for (const link of cta) expect(link).toHaveAttribute("href", "/en/inquiry");
  });

  it("shows the same honest empty state, and no error, when the database is not configured", async () => {
    repository.listPublishedProducts.mockResolvedValue({ ok: false, cause: "not_configured" });
    repository.countPublishedByCategory.mockResolvedValue({ ok: false, cause: "not_configured" });

    await renderServer(await ProductsPage(props("en")));

    expect(screen.getByText("No products have been published yet.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.connection).not.toHaveBeenCalled();
  });

  it("says so, without failing, when the database is unreachable, and keeps that render out of the page cache", async () => {
    repository.listPublishedProducts.mockResolvedValue({ ok: false, cause: "connection" });
    repository.countPublishedByCategory.mockResolvedValue({ ok: false, cause: "connection" });

    await renderServer(await ProductsPage(props("en")));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Product listings are unavailable right now",
    );
    expect(screen.getAllByRole("link", { name: /Metal Products/ })).not.toHaveLength(0);
    expect(mocks.connection).toHaveBeenCalledTimes(1);
  });

  it("lists published products and notes how many more there are", async () => {
    const items = [
      makeSummary({ slug: "a", name: "Alpha", image: makeImage(1) }),
      makeSummary({ slug: "b", name: "Beta", categorySlug: "metal-products" }),
    ];
    repository.listPublishedProducts.mockResolvedValue({
      ok: true,
      data: pageOf(items, { total: 9 }),
    });

    await renderServer(await ProductsPage(props("en")));

    expect(screen.getByRole("link", { name: "Alpha" })).toHaveAttribute(
      "href",
      "/en/products/hardware-products/a",
    );
    expect(
      screen.getByText("Showing 2 of 9 published products. Open a category to see the rest."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No products have been published yet.")).not.toBeInTheDocument();
    expect(repository.listPublishedProducts).toHaveBeenCalledWith({
      locale: "en",
      page: 1,
      pageSize: 6,
    });
  });

  it("shows product counts on the category cards only where products exist", async () => {
    repository.countPublishedByCategory.mockResolvedValue({
      ok: true,
      data: { ...noCounts(), "metal-products": 3 },
    });

    await renderServer(await ProductsPage(props("en")));

    expect(screen.getAllByText(/published products?$/)).toHaveLength(1);
    expect(screen.getByText("3 published products")).toBeInTheDocument();
  });

  it("describes itself to search engines: breadcrumb and a collection of the twelve category pages", async () => {
    const { container } = await renderServer(await ProductsPage(props("en")));
    const data = readJsonLd(container);

    expect(data.find((entry) => entry["@type"] === "BreadcrumbList")).toMatchObject({
      itemListElement: [{ name: "Home" }, { name: "Products" }],
    });
    const collection = data.find((entry) => entry["@type"] === "CollectionPage") as {
      mainEntity: { numberOfItems: number };
    };
    expect(collection.mainEntity.numberOfItems).toBe(12);
  });

  it.each(LOCALES)("renders in %s", async (locale) => {
    setTestLocale(locale);
    const { container } = await renderServer(await ProductsPage(props(locale)));
    expect(within(container).getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelector(`a[href="/${locale}/products/food-products"]`)).not.toBeNull();
  });

  it("is a 404 for a locale the site does not have", async () => {
    await expect(ProductsPage(props("xx"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("/products metadata", () => {
  it("has a title, description and canonical with hreflang for every language", async () => {
    const metadata = await generateMetadata(props("en"));

    expect(metadata.title).toMatchObject({
      absolute: "Product categories and sourcing | Shaheen Sky",
    });
    expect(metadata.description).toMatch(/twelve product categories/);
    expect(metadata.alternates?.canonical).toMatch(/\/en\/products$/);
    expect(Object.keys(metadata.alternates?.languages ?? {}).sort()).toEqual(
      ["ar", "en", "x-default", "zh-CN"].sort(),
    );
  });

  it("is translated", async () => {
    const metadata = await generateMetadata(props("zh"));
    expect(metadata.title).toMatchObject({ absolute: "产品类别与寻源 | Shaheen Sky" });
  });
});
