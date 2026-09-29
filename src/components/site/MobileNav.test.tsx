import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSiteNavModel } from "./build-nav-model";
import { MobileNav } from "./MobileNav";
import type { SiteNavModel } from "./nav-types";
import {
  blockLinkNavigation,
  installDomPolyfills,
  navigation,
  renderWithIntl,
  resetNavigation,
} from "./test-utils";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/lib/analytics/track", () => ({ trackEvent: vi.fn() }));

let model: SiteNavModel;
let unblockNavigation: () => void;

beforeAll(async () => {
  installDomPolyfills();
  model = await buildSiteNavModel("en");
});
beforeEach(() => {
  resetNavigation("/");
  unblockNavigation = blockLinkNavigation();
});
afterEach(() => unblockNavigation());

const openTrigger = () => screen.getByRole("button", { name: "Open menu" });

describe("MobileNav", () => {
  it("shows only the menu button until it is opened", () => {
    renderWithIntl(<MobileNav {...model} />);

    expect(openTrigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a dialog with the full navigation, the language list and the inquiry button", async () => {
    const user = userEvent.setup();
    renderWithIntl(<MobileNav {...model} />);

    await user.click(openTrigger());

    const dialog = screen.getByRole("dialog", { name: "Menu" });
    const nav = within(dialog).getByRole("navigation", { name: "Main navigation" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Home", "About", "Business", "Products", "Global Trade", "Company", "Contact"]);
    expect(within(dialog).getByRole("list", { name: "Language" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Send inquiry" })).toHaveAttribute(
      "href",
      "/en/inquiry",
    );
  });

  it("closes on Escape and returns focus to the menu button", async () => {
    const user = userEvent.setup();
    renderWithIntl(<MobileNav {...model} />);
    await user.click(openTrigger());
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(openTrigger()).toHaveFocus();
  });

  it("closes with its close button and returns focus to the menu button", async () => {
    const user = userEvent.setup();
    renderWithIntl(<MobileNav {...model} />);
    await user.click(openTrigger());

    await user.click(screen.getByRole("button", { name: "Close menu" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(openTrigger()).toHaveFocus();
  });

  it("locks page scrolling while open and releases it on close", async () => {
    const user = userEvent.setup();
    renderWithIntl(<MobileNav {...model} />);

    await user.click(openTrigger());
    expect(document.body).toHaveAttribute("data-scroll-locked");

    await user.keyboard("{Escape}");
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
  });

  it("keeps Tab focus inside the open menu", async () => {
    const user = userEvent.setup();
    renderWithIntl(<MobileNav {...model} />);
    await user.click(openTrigger());
    const dialog = screen.getByRole("dialog");

    for (let step = 0; step < 24; step += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("closes when the route changes", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithIntl(<MobileNav {...model} />);
    await user.click(openTrigger());
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    navigation.pathname = "/about";
    rerender(<MobileNav {...model} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when a link to the page you are already on is chosen", async () => {
    const user = userEvent.setup();
    navigation.pathname = "/about";
    renderWithIntl(<MobileNav {...model} />);
    await user.click(openTrigger());

    await user.click(within(screen.getByRole("dialog")).getByRole("link", { name: "About" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marks the current page and its section", async () => {
    const user = userEvent.setup();
    navigation.pathname = "/business/product-sourcing";
    renderWithIntl(<MobileNav {...model} />);
    await user.click(openTrigger());
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByRole("link", { name: "Business" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(within(dialog).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("expands Business and Products in place, one at a time", async () => {
    const user = userEvent.setup();
    renderWithIntl(<MobileNav {...model} />);
    await user.click(openTrigger());
    const dialog = screen.getByRole("dialog");
    const business = within(dialog).getByRole("button", { name: "Business menu" });
    const products = within(dialog).getByRole("button", { name: "Products menu" });

    expect(business).toHaveAttribute("aria-expanded", "false");
    expect(
      within(dialog).queryByRole("link", { name: "Product Sourcing" }),
    ).not.toBeInTheDocument();

    await user.click(business);
    expect(business).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByRole("link", { name: "Product Sourcing" })).toHaveAttribute(
      "href",
      "/en/business/product-sourcing",
    );
    expect(within(dialog).getByRole("link", { name: "All business lines" })).toHaveAttribute(
      "href",
      "/en/business",
    );

    await user.click(products);
    expect(products).toHaveAttribute("aria-expanded", "true");
    expect(business).toHaveAttribute("aria-expanded", "false");
    expect(within(dialog).getByRole("link", { name: "Food Products" })).toHaveAttribute(
      "href",
      "/en/products/food-products",
    );
  });

  it("is a right-hand drawer that mirrors to the left in Arabic", async () => {
    const user = userEvent.setup();
    const arabic = await buildSiteNavModel("ar");
    renderWithIntl(<MobileNav {...arabic} />, "ar");

    await user.click(screen.getByRole("button", { name: "فتح القائمة" }));

    const dialog = screen.getByRole("dialog", { name: "القائمة" });
    expect(dialog).toHaveClass("end-0", "border-s");
    expect(within(dialog).getByRole("link", { name: "أرسل استفسارًا" })).toHaveAttribute(
      "href",
      "/ar/inquiry",
    );
  });
});
