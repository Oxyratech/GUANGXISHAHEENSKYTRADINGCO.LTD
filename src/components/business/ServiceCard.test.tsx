import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SERVICE_SLUGS } from "@/content/services";
import { ServiceCard } from "./ServiceCard";
import { intlServerMock, renderServer, resetNavigation } from "./test-utils";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);

beforeEach(() => {
  resetNavigation("/business");
  intlServerMock.getLocale.mockClear();
});

describe("ServiceCard", () => {
  it("links the line's name to its page, under an h3 by default", async () => {
    await renderServer(<ServiceCard slug="import-export" locale="en" />);

    const heading = screen.getByRole("heading", { level: 3, name: "Import & Export" });
    expect(within(heading).getByRole("link")).toHaveAttribute("href", "/en/business/import-export");
  });

  it("supports an h2 for cards that sit directly under the page title", async () => {
    await renderServer(<ServiceCard slug="product-sourcing" headingLevel={2} locale="en" />);

    expect(screen.getByRole("heading", { level: 2, name: "Product Sourcing" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("shows the registry summary and exposes exactly one link", async () => {
    await renderServer(<ServiceCard slug="supplier-coordination" locale="en" />);

    expect(
      screen.getByText(/Coordinating communication between buyers and suppliers/),
    ).toBeVisible();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    // The "Learn more" row is a visual cue on the whole-card link, not a second link or a name.
    expect(screen.getByRole("link")).toHaveAccessibleName("Supplier Coordination");
  });

  it("has a compact form without the learn more row", async () => {
    await renderServer(<ServiceCard slug="cross-border-trade" compact locale="en" />);

    expect(screen.getByRole("link", { name: "Cross-Border Trade" })).toHaveAttribute(
      "href",
      "/en/business/cross-border-trade",
    );
    expect(screen.queryByText("Learn more")).not.toBeInTheDocument();
  });

  it.each([
    ["en", "International Trading", "/en/business/international-trading"],
    ["zh", "国际贸易", "/zh/business/international-trading"],
    ["ar", "التجارة الدولية", "/ar/business/international-trading"],
  ] as const)("renders in %s", async (locale, name, href) => {
    await renderServer(<ServiceCard slug="international-trading" locale={locale} />, locale);

    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  });

  it.each(SERVICE_SLUGS)(
    "renders %s with an icon that assistive technology skips",
    async (slug) => {
      const { container } = await renderServer(<ServiceCard slug={slug} locale="en" />);

      expect(container.querySelector("svg[aria-hidden='true']")).not.toBeNull();
      expect(screen.getByRole("link")).toHaveAttribute("href", `/en/business/${slug}`);
    },
  );

  it("uses the request locale when none is passed", async () => {
    resetNavigation("/business", "zh");
    await renderServer(<ServiceCard slug="import-export" />, "zh");

    expect(intlServerMock.getLocale).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "进出口" })).toBeInTheDocument();
  });

  it("does not look the locale up when the caller passes it", async () => {
    await renderServer(<ServiceCard slug="import-export" locale="en" />);

    expect(intlServerMock.getLocale).not.toHaveBeenCalled();
  });
});
