import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/content/categories";
import { LOCALES } from "@/i18n/locales";
import enCategories from "@/messages/en/categories.json";
import { CategoryCard } from "./CategoryCard";
import { renderServer, setTestLocale } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

describe("CategoryCard", () => {
  it("links a non-regulated category to its page and shows its summary", async () => {
    await renderServer(<CategoryCard slug="hardware-products" locale="en" />);

    expect(screen.getByRole("link", { name: "Hardware Products" })).toHaveAttribute(
      "href",
      "/en/products/hardware-products",
    );
    expect(screen.getByText(enCategories["hardware-products"].summary)).toBeInTheDocument();
    expect(screen.queryByText("Regulated")).not.toBeInTheDocument();
  });

  it("marks a regulated category with a Regulated badge", async () => {
    await renderServer(<CategoryCard slug="food-products" locale="en" />);

    expect(screen.getByText("Regulated")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Food Products" })).toBeInTheDocument();
  });

  it.each(CATEGORIES.map((category) => [category.slug, category.regulated] as const))(
    "%s: the badge appears exactly when the category is regulated (%s)",
    async (slug, regulated) => {
      await renderServer(<CategoryCard slug={slug} locale="en" />);
      expect(screen.queryAllByText("Regulated")).toHaveLength(regulated ? 1 : 0);
    },
  );

  it("is a single link: the whole card is one tab stop named by the category", async () => {
    await renderServer(<CategoryCard slug="metal-products" locale="en" />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("uses the requested heading level and defaults to h3", async () => {
    const { unmount } = await renderServer(<CategoryCard slug="metal-products" locale="en" />);
    expect(
      screen.getByRole("heading", { level: 3, name: "Metal Products & Materials" }),
    ).toBeInTheDocument();
    unmount();

    await renderServer(<CategoryCard slug="metal-products" locale="en" headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("has a compact form without the summary that is still a labelled link", async () => {
    await renderServer(<CategoryCard slug="minerals-ores" locale="en" compact headingLevel={3} />);

    expect(screen.getByRole("link", { name: "Minerals & Ores" })).toHaveAttribute(
      "href",
      "/en/products/minerals-ores",
    );
    expect(screen.queryByText(enCategories["minerals-ores"].summary)).not.toBeInTheDocument();
    expect(screen.getByText("Regulated")).toBeInTheDocument();
  });

  it("shows a product count only when there are published products", async () => {
    const { unmount } = await renderServer(<CategoryCard slug="metal-products" locale="en" />);
    expect(screen.queryByText(/published product/)).not.toBeInTheDocument();
    unmount();

    const zero = await renderServer(
      <CategoryCard slug="metal-products" locale="en" productCount={0} />,
    );
    expect(screen.queryByText(/published product/)).not.toBeInTheDocument();
    zero.unmount();

    const one = await renderServer(
      <CategoryCard slug="metal-products" locale="en" productCount={1} />,
    );
    expect(screen.getByText("1 published product")).toBeInTheDocument();
    one.unmount();

    await renderServer(<CategoryCard slug="metal-products" locale="en" productCount={7} />);
    expect(screen.getByText("7 published products")).toBeInTheDocument();
  });

  it("reads the locale from the request when none is passed", async () => {
    setTestLocale("zh");
    await renderServer(<CategoryCard slug="food-products" />);
    expect(screen.getByRole("link", { name: "食品" })).toHaveAttribute(
      "href",
      "/zh/products/food-products",
    );
    expect(screen.getByText("受监管")).toBeInTheDocument();
    setTestLocale("en");
  });

  it.each(LOCALES)("renders every category in %s with all its messages present", async (locale) => {
    for (const { slug } of CATEGORIES) {
      const { unmount } = await renderServer(
        <CategoryCard slug={slug} locale={locale} productCount={3} />,
      );
      expect(screen.getAllByRole("link")).toHaveLength(1);
      unmount();
    }
  });

  it("badges regulated categories in Arabic", async () => {
    await renderServer(<CategoryCard slug="medical-protective-supplies" locale="ar" />);
    expect(screen.getByText("خاضعة للتنظيم")).toBeInTheDocument();
  });
});
