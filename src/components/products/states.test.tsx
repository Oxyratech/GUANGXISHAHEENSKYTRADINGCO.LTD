import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/locales";
import enCategories from "@/messages/en/categories.json";
import { AvailabilityNote } from "./AvailabilityNote";
import { CategoryEmptyState } from "./CategoryEmptyState";
import { ProductsUnavailableState } from "./ProductsUnavailableState";
import { RegulatedNote } from "./RegulatedNote";
import { renderServer } from "./test-utils";

vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

describe("CategoryEmptyState", () => {
  it("says no products have been published in the category and offers an inquiry for it", async () => {
    await renderServer(<CategoryEmptyState locale="en" categorySlug="metal-products" />);

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "No products have been published in this category yet.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Products are sourced against buyer requirements/)).toBeInTheDocument();
    expect(screen.getByText(/Metal Products & Materials/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Send an inquiry about this category" }),
    ).toHaveAttribute("href", "/en/inquiry?category=metal-products");
  });

  it("has an index variant that links to the plain inquiry form", async () => {
    await renderServer(<CategoryEmptyState locale="en" />);

    expect(
      screen.getByRole("heading", { name: "No products have been published yet." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send inquiry" })).toHaveAttribute(
      "href",
      "/en/inquiry",
    );
  });

  it("lets the page choose the heading level", async () => {
    await renderServer(<CategoryEmptyState locale="en" titleAs="h2" />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("never invents stock, prices or delivery promises", async () => {
    const { container } = await renderServer(
      <CategoryEmptyState locale="en" categorySlug="consumer-goods" />,
    );
    expect(container.textContent).not.toMatch(/coming soon|in stock|price|delivery within/i);
  });

  it.each(LOCALES)("renders in %s", async (locale) => {
    await renderServer(<CategoryEmptyState locale={locale} categorySlug="food-products" />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });
});

describe("ProductsUnavailableState", () => {
  it("is an alert with a way forward, and shows no error details", async () => {
    const { container } = await renderServer(<ProductsUnavailableState locale="en" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Product listings are unavailable right now" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send inquiry" })).toHaveAttribute(
      "href",
      "/en/inquiry",
    );
    expect(container.textContent).not.toMatch(/prisma|sql|stack|ECONN|database/i);
  });

  it("can be the page's h1", async () => {
    await renderServer(<ProductsUnavailableState locale="en" titleAs="h1" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});

describe("AvailabilityNote", () => {
  it("states that categories are areas of trade, not stock", async () => {
    await renderServer(<AvailabilityNote locale="en" />);
    expect(screen.getByText(enCategories.availabilityNote)).toBeInTheDocument();
  });

  it.each(LOCALES)("renders in %s", async (locale) => {
    const { container } = await renderServer(<AvailabilityNote locale={locale} />);
    expect(container.textContent?.length).toBeGreaterThan(10);
  });
});

describe("RegulatedNote", () => {
  it("shows the shared compliance wording under a Regulated goods heading", async () => {
    await renderServer(<RegulatedNote locale="en" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Regulated goods")).toBeInTheDocument();
    expect(screen.getByText(enCategories.regulatedNote)).toBeInTheDocument();
  });

  it("does not claim that any approval is held", async () => {
    const { container } = await renderServer(<RegulatedNote locale="en" />);
    expect(container.textContent).toMatch(/not a statement that such approvals are held/);
  });
});
