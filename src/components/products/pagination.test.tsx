import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildPageHref, PAGE_PARAM, parsePageParam } from "./pagination";
import { ProductPagination } from "./ProductPagination";
import { renderServer, setTestLocale } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

describe("parsePageParam", () => {
  it("reads a positive whole number", () => {
    expect(parsePageParam("1")).toBe(1);
    expect(parsePageParam("7")).toBe(7);
    expect(parsePageParam("120")).toBe(120);
  });

  it("uses the first value when the parameter is repeated", () => {
    expect(parsePageParam(["4", "9"])).toBe(4);
  });

  it.each([undefined, "", "0", "-2", "1.5", "abc", "2x", " 3", "1e3", "9999999", "٣", "<script>"])(
    "falls back to page 1 for %j",
    (value) => {
      expect(parsePageParam(value)).toBe(1);
    },
  );

  it("falls back to page 1 for an empty list", () => {
    expect(parsePageParam([])).toBe(1);
  });
});

describe("buildPageHref", () => {
  it("gives the first page the plain path so it has a single address", () => {
    expect(buildPageHref("/products/metal-products", 1)).toBe("/products/metal-products");
    expect(buildPageHref("/products/metal-products", 0)).toBe("/products/metal-products");
    expect(buildPageHref("/products/metal-products", -3)).toBe("/products/metal-products");
  });

  it("puts later pages in the query string", () => {
    expect(buildPageHref("/products/metal-products", 2)).toBe(
      `/products/metal-products?${PAGE_PARAM}=2`,
    );
    expect(buildPageHref("/products/metal-products", 12)).toBe("/products/metal-products?page=12");
  });

  it("round-trips through the parser", () => {
    for (const page of [1, 2, 9, 40]) {
      const href = buildPageHref("/products/x", page);
      const value = new URL(href, "https://example.com").searchParams.get(PAGE_PARAM) ?? undefined;
      expect(parsePageParam(value)).toBe(page);
    }
  });
});

describe("ProductPagination", () => {
  it("renders nothing for a single page", async () => {
    const { container } = await renderServer(
      <ProductPagination locale="en" page={1} pageCount={1} basePath="/products/metal-products" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("links every page with crawlable hrefs, page 1 without a query", async () => {
    await renderServer(
      <ProductPagination locale="en" page={2} pageCount={3} basePath="/products/metal-products" />,
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
    expect(within(nav).getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/en/products/metal-products",
    );
    expect(within(nav).getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/en/products/metal-products?page=3",
    );
  });

  it("marks the current page and does not link it", async () => {
    await renderServer(
      <ProductPagination locale="en" page={2} pageCount={3} basePath="/products/metal-products" />,
    );
    const current = screen
      .getAllByText("2")
      .find((node) => node.getAttribute("aria-current") === "page");
    expect(current).toBeDefined();
    expect(current?.closest("a")).toBeNull();
  });

  it("labels the navigation and pages in Chinese", async () => {
    setTestLocale("zh");
    await renderServer(
      <ProductPagination locale="zh" page={1} pageCount={2} basePath="/products/metal-products" />,
    );
    const nav = screen.getByRole("navigation", { name: "产品分页" });
    expect(within(nav).getByRole("link", { name: "第 2 页" })).toHaveAttribute(
      "href",
      "/zh/products/metal-products?page=2",
    );
  });
});
