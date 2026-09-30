import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  makeDetail,
  makeImage,
  makeSummary,
  renderServer,
  setTestLocale,
} from "@/components/products/test-utils";
import { LOCALES } from "@/i18n/locales";
import type { ProductDetail } from "@/server/products";
import { headingLevels, readJsonLd, repository, resetRepository } from "../../_lib/test-repository";

const mocks = vi.hoisted(() => ({ connection: vi.fn(), trackEvent: vi.fn() }));

vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/analytics/track", () => ({ trackEvent: mocks.trackEvent }));
vi.mock(
  "next-intl/server",
  async () => (await import("@/components/products/test-utils")).intlServerMock,
);
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/products/test-utils")).navigationMock,
);
vi.mock("@/server/products", async () =>
  (await import("../../_lib/test-repository")).repositoryMock(),
);

import ProductPage, { generateMetadata, generateStaticParams } from "./page";

type Props = PageProps<"/[locale]/products/[category]/[product]">;

const props = (product = "sample-product", locale = "en", category = "hardware-products") =>
  ({
    params: Promise.resolve({ locale, category, product }),
    searchParams: Promise.resolve({}),
  }) as Props;

function fullProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return makeDetail({
    origin: "Guangxi, China",
    description: "A description with **emphasis**.\n\nSecond paragraph.",
    applications: "- Fastening\n- Assembly",
    packagingInfo: "Boxed in cartons.",
    images: [makeImage(1, "Front view"), makeImage(2, "Side view")],
    image: makeImage(1, "Front view"),
    specifications: [
      { label: "Length", value: "40 mm", contentLocale: "en" },
      { label: "Material", value: "Carbon steel", contentLocale: "en" },
    ],
    documents: [
      {
        kind: "SPECIFICATION_SHEET",
        title: "Specification sheet",
        contentLocale: "en",
        href: "/media/0a1b2c3d-0000-4000-8000-0000000000d1",
        fileName: "spec.pdf",
        mimeType: "application/pdf",
        sizeBytes: 4096,
      },
    ],
    related: [makeSummary({ slug: "washer", name: "Washer" })],
    translatedLocales: ["en", "zh"],
    ...overrides,
  });
}

const published = (product: ProductDetail | null) =>
  repository.getPublishedProduct.mockResolvedValue({ ok: true, data: product });

beforeEach(() => {
  resetRepository();
  mocks.connection.mockReset().mockResolvedValue(undefined);
  mocks.trackEvent.mockReset();
});

describe("product route configuration", () => {
  it("prerenders nothing (the catalogue does not exist at build time) but serves any slug on demand", () => {
    expect(generateStaticParams()).toEqual([]);
  });
});

describe("a product that is not published", () => {
  it("is a 404: the page never renders", async () => {
    published(null);
    await expect(ProductPage(props("draft-product"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(repository.getPublishedProduct).toHaveBeenCalledWith({
      locale: "en",
      categorySlug: "hardware-products",
      slug: "draft-product",
    });
  });

  it("is a 404 for a locale the site does not have, without reading the catalogue", async () => {
    await expect(ProductPage(props("sample-product", "xx"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(repository.getPublishedProduct).not.toHaveBeenCalled();
  });

  it("has no metadata of its own, so nothing about it can be indexed", async () => {
    published(null);
    expect(await generateMetadata(props("draft-product"))).toEqual({});
  });

  it("is a 404 when the category and product do not belong together", async () => {
    published(null);
    await expect(ProductPage(props("sample-product", "en", "metal-products"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(repository.getPublishedProduct).toHaveBeenCalledWith(
      expect.objectContaining({ categorySlug: "metal-products" }),
    );
  });
});

describe("when no database is configured", () => {
  it("is a 404 and has no metadata: nothing can be published, so no product exists", async () => {
    repository.getPublishedProduct.mockResolvedValue({ ok: false, cause: "not_configured" });

    await expect(ProductPage(props())).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await generateMetadata(props())).toEqual({});
    expect(mocks.connection).not.toHaveBeenCalled();
  });
});

describe("when the database is unavailable", () => {
  beforeEach(() => {
    repository.getPublishedProduct.mockResolvedValue({ ok: false, cause: "connection" });
  });

  it("shows an honest state with the only h1, not a 404 and not an error", async () => {
    await renderServer(await ProductPage(props()));

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Product listings are unavailable right now",
    );
  });

  it("is kept out of the page cache and out of search indexes", async () => {
    await renderServer(await ProductPage(props()));
    expect(mocks.connection).toHaveBeenCalledTimes(1);
    expect(await generateMetadata(props())).toEqual({ robots: { index: false, follow: false } });
  });
});

describe("a published product", () => {
  it("has one h1 with the product name, no <main> of its own and a valid heading outline", async () => {
    published(fullProduct());
    const { container } = await renderServer(await ProductPage(props()));

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Sample product" })).toBeInTheDocument();
    expect(container.querySelector("main")).toBeNull();
    const levels = headingLevels(container);
    levels.forEach((level, index) => {
      if (index > 0) expect(level).toBeLessThanOrEqual((levels[index - 1] ?? 0) + 1);
    });
  });

  it("has a breadcrumb trail down to the product", async () => {
    published(fullProduct());
    await renderServer(await ProductPage(props()));

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const items = within(nav).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Home",
      "Products",
      "Hardware Products",
      "Sample product",
    ]);
    expect(within(nav).getByRole("link", { name: "Hardware Products" })).toHaveAttribute(
      "href",
      "/en/products/hardware-products",
    );
    expect(within(items[3]!).getByText("Sample product")).toHaveAttribute("aria-current", "page");
  });

  it("offers a quote for this product first and a business inquiry second, both real links", async () => {
    published(fullProduct());
    await renderServer(await ProductPage(props()));

    expect(screen.getByRole("link", { name: "Request a quote" })).toHaveAttribute(
      "href",
      "/en/inquiry?product=sample-product&category=hardware-products",
    );
    expect(screen.getByRole("link", { name: "Send business inquiry" })).toHaveAttribute(
      "href",
      "/en/inquiry?category=hardware-products",
    );
  });

  it("states what it does not hold and shows no price, order quantity, lead time or stock", async () => {
    published(fullProduct());
    const { container } = await renderServer(await ProductPage(props()));

    expect(
      screen.getByText(/does not list prices, minimum order quantities or lead times/),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\$\s?\d|USD|RMB|in stock/i);
  });

  it("shows the gallery, description, applications, packaging, specifications and documents", async () => {
    published(fullProduct());
    await renderServer(await ProductPage(props()));

    expect(screen.getByRole("tablist", { name: "Choose an image" })).toBeInTheDocument();
    expect(screen.getByText("emphasis").tagName).toBe("STRONG");
    expect(screen.getByRole("heading", { level: 2, name: "Description" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Applications" })).toBeInTheDocument();
    expect(screen.getByText("Fastening")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Packaging information" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Specifications of Sample product" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download Specification sheet/ })).toHaveAttribute(
      "href",
      "/media/0a1b2c3d-0000-4000-8000-0000000000d1",
    );
    expect(screen.getByText("Guangxi, China")).toBeInTheDocument();
  });

  it("shows only what the product has: no empty sections, a placeholder instead of a photo", async () => {
    published(makeDetail());
    const { container } = await renderServer(await ProductPage(props()));

    for (const heading of [
      "Description",
      "Applications",
      "Packaging information",
      "Specifications",
      "Documents",
      "More from Hardware Products",
    ]) {
      expect(screen.queryByRole("heading", { name: heading })).not.toBeInTheDocument();
    }
    expect(
      screen.getByRole("img", { name: "No photo of Sample product has been published." }),
    ).toBeInTheDocument();
    expect(container.querySelector("table")).toBeNull();
    expect(screen.getByRole("link", { name: "Request a quote" })).toBeInTheDocument();
  });

  it("lists related products of the same category and neighbouring categories", async () => {
    published(fullProduct());
    const { container } = await renderServer(await ProductPage(props()));

    expect(
      screen.getByRole("heading", { level: 2, name: "More from Hardware Products" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Washer" })).toHaveAttribute(
      "href",
      "/en/products/hardware-products/washer",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Explore other categories" }),
    ).toBeInTheDocument();
    expect(container.querySelector('a[href="/en/products/electrical-products"]')).not.toBeNull();
  });

  it("describes only real data: no offer, price, availability, brand or rating", async () => {
    published(fullProduct());
    const { container } = await renderServer(await ProductPage(props()));
    const product = readJsonLd(container).find((entry) => entry["@type"] === "Product");

    expect(product).toMatchObject({
      name: "Sample product",
      description: "A short description of the sample product.",
      category: "Hardware Products",
      url: expect.stringMatching(/\/en\/products\/hardware-products\/sample-product$/),
      additionalProperty: [
        { name: "Length", value: "40 mm" },
        { name: "Material", value: "Carbon steel" },
      ],
    });
    expect((product?.image as string[]).every((url) => /^https?:\/\/.+\/media\//.test(url))).toBe(
      true,
    );
    for (const forbidden of [
      "offers",
      "price",
      "availability",
      "brand",
      "aggregateRating",
      "review",
      "sku",
      "mpn",
    ]) {
      expect(product).not.toHaveProperty(forbidden);
    }
    expect(
      readJsonLd(container).find((entry) => entry["@type"] === "BreadcrumbList"),
    ).toMatchObject({
      itemListElement: [
        { name: "Home" },
        { name: "Products" },
        { name: "Hardware Products" },
        { name: "Sample product" },
      ],
    });
  });

  it("records a product_view event for the product and category", async () => {
    published(fullProduct());
    await renderServer(await ProductPage(props()));
    expect(mocks.trackEvent).toHaveBeenCalledWith("product_view", {
      product: "sample-product",
      category: "hardware-products",
      locale: "en",
    });
  });

  it("does not warn about a missing translation in any language", async () => {
    for (const locale of LOCALES) {
      setTestLocale(locale);
      published(fullProduct({ contentLocale: locale }));
      const { container, unmount } = await renderServer(
        await ProductPage(props("sample-product", locale)),
      );
      expect(within(container).getAllByRole("heading", { level: 1 })).toHaveLength(1);
      unmount();
    }
  });
});

describe("a product without a translation for the page language", () => {
  it("shows the English text, says so, and marks it as English", async () => {
    setTestLocale("ar");
    published(fullProduct({ contentLocale: "en", translatedLocales: ["en"] }));

    await renderServer(await ProductPage(props("sample-product", "ar")));

    expect(screen.getByText("معروض بالإنجليزية")).toBeInTheDocument();
    const title = screen.getByRole("heading", { level: 1 });
    expect(title.querySelector("span")).toHaveAttribute("lang", "en");
    expect(title.querySelector("span")).toHaveAttribute("dir", "ltr");
  });

  it("is not indexed and does not advertise language versions it does not have", async () => {
    published(fullProduct({ contentLocale: "en", translatedLocales: ["en", "zh"] }));

    const metadata = await generateMetadata(props("sample-product", "ar"));

    expect(metadata.robots).toMatchObject({ index: false });
    expect(Object.keys(metadata.alternates?.languages ?? {}).sort()).toEqual([
      "en",
      "x-default",
      "zh-CN",
    ]);
  });
});

describe("product metadata", () => {
  it("uses the product's own name and description, canonical URL, image and hreflang", async () => {
    published(fullProduct());

    const metadata = await generateMetadata(props());

    expect(metadata.title).toMatchObject({ absolute: "Sample product | Shaheen Sky" });
    expect(metadata.description).toBe("A short description of the sample product.");
    expect(metadata.alternates?.canonical).toMatch(
      /\/en\/products\/hardware-products\/sample-product$/,
    );
    expect(Object.keys(metadata.alternates?.languages ?? {}).sort()).toEqual([
      "en",
      "x-default",
      "zh-CN",
    ]);
    expect(metadata.robots).toBeUndefined();
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: expect.stringContaining("/media/"),
        alt: "Front view",
        width: 1200,
        height: 900,
      }),
    ]);
  });

  it("writes a truthful description from the category when the product has no short description", async () => {
    published(fullProduct({ shortDescription: null }));
    const metadata = await generateMetadata(props());
    expect(metadata.description).toBe(
      "Sample product in the Hardware Products category. Send an inquiry to ask about specifications, quantities and delivery.",
    );
  });

  it("shortens a very long description", async () => {
    published(fullProduct({ shortDescription: `${"word ".repeat(120)}end` }));
    const metadata = await generateMetadata(props());
    expect((metadata.description ?? "").length).toBeLessThanOrEqual(200);
    expect(metadata.description).toMatch(/…$/);
  });

  it("honours an editor's override for the product, including noindex", async () => {
    published(fullProduct());
    repository.getSeoOverride.mockResolvedValue({
      title: "Bolt override",
      description: "Custom description.",
      noIndex: true,
      ogImage: { url: "/media/0a1b2c3d-0000-4000-8000-00000000000f", width: null, height: null },
    });

    const metadata = await generateMetadata(props());

    expect(repository.getSeoOverride).toHaveBeenCalledWith({
      scope: "PRODUCT",
      refKey: "sample-product",
      locale: "en",
    });
    expect(metadata.title).toMatchObject({ absolute: "Bolt override | Shaheen Sky" });
    expect(metadata.description).toBe("Custom description.");
    expect(metadata.robots).toMatchObject({ index: false });
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: expect.stringContaining("/media/0a1b2c3d-0000-4000-8000-00000000000f"),
      }),
    ]);
  });

  it("falls back to the branded default card when the product has no image", async () => {
    published(fullProduct({ image: null, images: [] }));
    const metadata = await generateMetadata(props());
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: expect.stringContaining("opengraph-image") }),
    ]);
  });
});
