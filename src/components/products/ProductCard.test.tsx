import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCard } from "./ProductCard";
import { ProductGrid } from "./ProductGrid";
import { makeImage, makeSummary, renderServer } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

describe("ProductCard", () => {
  it("is one link to the product page, named by the product", async () => {
    await renderServer(<ProductCard product={makeSummary()} locale="en" />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Sample product" })).toHaveAttribute(
      "href",
      "/en/products/hardware-products/sample-product",
    );
    expect(screen.getByText("A short description of the sample product.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Sample product" })).toBeInTheDocument();
  });

  it("uses the requested heading level", async () => {
    await renderServer(<ProductCard product={makeSummary()} locale="en" headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("shows no price, order quantity, lead time or stock", async () => {
    const { container } = await renderServer(<ProductCard product={makeSummary()} locale="en" />);
    expect(container.textContent).not.toMatch(/\$|€|¥|USD|RMB|MOQ|price|in stock|lead time/i);
  });

  it("shows the category above the title when asked", async () => {
    await renderServer(<ProductCard product={makeSummary()} locale="en" showCategory />);
    expect(screen.getByText("Hardware Products")).toBeInTheDocument();
  });

  it("does not repeat the product name as the alt text of its own photo", async () => {
    const { container } = await renderServer(
      <ProductCard
        product={makeSummary({ image: { ...makeImage(1), alt: "Sample product" } })}
        locale="en"
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("keeps a distinct alt text", async () => {
    await renderServer(
      <ProductCard
        product={makeSummary({ image: makeImage(1, "The product on a pallet") })}
        locale="en"
      />,
    );
    expect(screen.getByRole("img", { name: "The product on a pallet" })).toBeInTheDocument();
  });

  it("falls back to a vector illustration, hidden from assistive technology, without an image", async () => {
    const { container } = await renderServer(
      <ProductCard product={makeSummary({ image: null })} locale="en" />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("marks English text inside a page in another language", async () => {
    await renderServer(<ProductCard product={makeSummary({ contentLocale: "en" })} locale="ar" />);
    const title = screen.getByRole("heading", { level: 3 });
    const wrapper = title.parentElement;
    expect(wrapper).toHaveAttribute("lang", "en");
    expect(wrapper).toHaveAttribute("dir", "ltr");
  });

  it("adds no language attributes when the text is in the page language", async () => {
    await renderServer(
      <ProductCard product={makeSummary({ contentLocale: "zh", name: "钢制螺栓" })} locale="zh" />,
    );
    const wrapper = screen.getByRole("heading", { level: 3 }).parentElement;
    expect(wrapper).not.toHaveAttribute("lang");
    expect(wrapper).not.toHaveAttribute("dir");
  });

  it("omits the description when there is none", async () => {
    await renderServer(
      <ProductCard product={makeSummary({ shortDescription: null })} locale="en" />,
    );
    expect(screen.queryByText(/short description/)).not.toBeInTheDocument();
  });
});

describe("ProductGrid", () => {
  const products = [
    makeSummary({ slug: "a", name: "Alpha" }),
    makeSummary({ slug: "b", name: "Beta", categorySlug: "metal-products" }),
    makeSummary({ slug: "c", name: "Gamma" }),
  ];

  it("lists every product as one list item", async () => {
    await renderServer(<ProductGrid products={products} locale="en" />);

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Beta" })).toHaveAttribute(
      "href",
      "/en/products/metal-products/b",
    );
  });

  it("passes the heading level and category display on to every card", async () => {
    await renderServer(
      <ProductGrid products={products} locale="en" headingLevel={2} showCategory />,
    );

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(screen.getByText("Metal Products & Materials")).toBeInTheDocument();
  });

  it("works in Arabic", async () => {
    await renderServer(<ProductGrid products={products} locale="ar" />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
});
