import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSiteNavModel } from "./build-nav-model";
import type { SiteNavModel } from "./nav-types";
import { SiteNav } from "./SiteNav";
import {
  blockLinkNavigation,
  installDomPolyfills,
  navigation,
  renderWithIntl,
  resetNavigation,
} from "./test-utils";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);

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

const businessToggle = () => screen.getByRole("button", { name: "Business menu" });
const productsToggle = () => screen.getByRole("button", { name: "Products menu" });
const hasLink = (name: RegExp) => screen.queryByRole("link", { name }) !== null;

describe("SiteNav", () => {
  it("is the labelled main navigation with the seven primary links", () => {
    renderWithIntl(<SiteNav items={model.items} />);

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const primary = within(nav)
      .getAllByRole("link")
      .filter((link) => link.closest("[hidden]") === null);
    expect(primary.map((link) => link.textContent)).toEqual([
      "Home",
      "About",
      "Business",
      "Products",
      "Global Trade",
      "Company",
      "Contact",
    ]);
    expect(primary.map((link) => link.getAttribute("href"))).toEqual([
      "/en",
      "/en/about",
      "/en/business",
      "/en/products",
      "/en/global-trade",
      "/en/company-information",
      "/en/contact",
    ]);
  });

  it("keeps Business and Products real links, so they work without JavaScript", () => {
    renderWithIntl(<SiteNav items={model.items} />);

    expect(screen.getByRole("link", { name: "Business" })).toHaveAttribute("href", "/en/business");
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/en/products");
  });

  it("highlights the current page with aria-current", () => {
    navigation.pathname = "/about";
    renderWithIntl(<SiteNav items={model.items} />);

    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Contact" })).not.toHaveAttribute("aria-current");
  });

  it("marks a section as current while one of its pages is open", async () => {
    const user = userEvent.setup();
    navigation.pathname = "/business/product-sourcing";
    renderWithIntl(<SiteNav items={model.items} />);

    expect(screen.getByRole("link", { name: "Business" })).toHaveAttribute("aria-current", "true");

    await user.click(businessToggle());
    expect(screen.getByRole("link", { name: /Product Sourcing/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("discloses the Business panel from its button: six business lines with summaries", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteNav items={model.items} />);
    expect(businessToggle()).toHaveAttribute("aria-expanded", "false");
    expect(hasLink(/International Trading/)).toBe(false);

    await user.click(businessToggle());

    expect(businessToggle()).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(businessToggle().getAttribute("aria-controls") ?? "");
    expect(panel).not.toHaveAttribute("hidden");
    const links = within(panel as HTMLElement).getAllByRole("link");
    expect(links).toHaveLength(7);
    expect(links[0]).toHaveTextContent("International Trading");
    expect(links[0]).toHaveTextContent("Trading and agency support");
    expect(links[6]).toHaveTextContent("All business lines");
    expect(links[6]).toHaveAttribute("href", "/en/business");

    await user.click(businessToggle());
    expect(businessToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("lists the twelve categories and All products under Products", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteNav items={model.items} />);

    await user.click(productsToggle());

    const panel = document.getElementById(productsToggle().getAttribute("aria-controls") ?? "");
    const links = within(panel as HTMLElement).getAllByRole("link");
    expect(links).toHaveLength(13);
    expect(links[0]).toHaveAttribute("href", "/en/products/consumer-goods");
    expect(links[12]).toHaveTextContent("All products");
  });

  it("closes on Escape and returns focus to the button that opened it", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteNav items={model.items} />);
    businessToggle().focus();
    await user.keyboard("{Enter}");
    expect(businessToggle()).toHaveAttribute("aria-expanded", "true");

    await user.tab();
    expect(screen.getByRole("link", { name: /International Trading/ })).toHaveFocus();
    await user.keyboard("{Escape}");

    expect(businessToggle()).toHaveAttribute("aria-expanded", "false");
    expect(businessToggle()).toHaveFocus();
  });

  it("closes when focus leaves the menu", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteNav items={model.items} />);
    businessToggle().focus();
    await user.keyboard("{Enter}");

    act(() => screen.getByRole("link", { name: "Global Trade" }).focus());

    expect(businessToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on a press outside the navigation", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <>
        <SiteNav items={model.items} />
        <button type="button">Elsewhere</button>
      </>,
    );
    await user.click(businessToggle());

    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(businessToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when the route changes", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithIntl(<SiteNav items={model.items} />);
    await user.click(businessToggle());
    expect(businessToggle()).toHaveAttribute("aria-expanded", "true");

    navigation.pathname = "/business/import-export";
    rerender(<SiteNav items={model.items} />);

    expect(businessToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens one panel at a time", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteNav items={model.items} />);

    await user.click(businessToggle());
    await user.click(productsToggle());

    expect(productsToggle()).toHaveAttribute("aria-expanded", "true");
    expect(businessToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on hover for a mouse and closes shortly after it leaves", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteNav items={model.items} />);

    await user.hover(screen.getByRole("link", { name: "Business" }));
    await waitFor(() => expect(businessToggle()).toHaveAttribute("aria-expanded", "true"));

    await user.unhover(screen.getByRole("link", { name: "Business" }));
    await waitFor(() => expect(businessToggle()).toHaveAttribute("aria-expanded", "false"));
  });

  it("keeps a hover-opened panel open when its button is then clicked", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteNav items={model.items} />);
    await user.hover(businessToggle());
    await waitFor(() => expect(businessToggle()).toHaveAttribute("aria-expanded", "true"));

    await user.click(businessToggle());

    expect(businessToggle()).toHaveAttribute("aria-expanded", "true");
    await user.click(businessToggle());
    expect(businessToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("puts the button right after its link, so Tab reaches the panel only on request", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteNav items={model.items} />);
    screen.getByRole("link", { name: "About" }).focus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Business" })).toHaveFocus();
    await user.tab();
    expect(businessToggle()).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Products" })).toHaveFocus();
  });
});
