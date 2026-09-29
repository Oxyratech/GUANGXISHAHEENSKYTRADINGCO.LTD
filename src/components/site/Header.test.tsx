import { screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./Header";
import { installDomPolyfills, renderWithIntl, resetNavigation } from "./test-utils";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);
vi.mock("next-intl/server", async () => (await import("./test-utils")).intlServerMock);
vi.mock("@/lib/analytics/track", () => ({ trackEvent: vi.fn() }));

beforeAll(installDomPolyfills);
beforeEach(() => resetNavigation("/about"));

describe("Header", () => {
  it("is the sticky banner of the page", async () => {
    renderWithIntl(await Header({ locale: "en" }));

    const banner = screen.getByRole("banner");
    expect(banner).toHaveClass("sticky", "top-0");
    expect(banner).toHaveClass("border-b", "bg-white");
  });

  it("links the logo to the home page with a translated name", async () => {
    renderWithIntl(await Header({ locale: "en" }));

    const logo = within(screen.getByRole("banner")).getByRole("link", {
      name: "Shaheen Sky, home page",
    });
    expect(logo).toHaveAttribute("href", "/en");
  });

  it("carries one prominent Send inquiry button to the inquiry form", async () => {
    renderWithIntl(await Header({ locale: "en" }));

    const inquiry = screen.getAllByRole("link", { name: "Send inquiry" });
    expect(inquiry).toHaveLength(1);
    expect(inquiry[0]).toHaveAttribute("href", "/en/inquiry");
    expect(inquiry[0]).toHaveClass("hidden", "xl:inline-flex");
  });

  it("has the desktop navigation, a language menu and the mobile menu button", async () => {
    renderWithIntl(await Header({ locale: "en" }));

    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(within(banner).getByRole("button", { name: /Language: English/ })).toBeInTheDocument();
    expect(within(banner).getByRole("button", { name: "Open menu" })).toHaveClass("xl:hidden");
  });

  it("highlights the page you are on", async () => {
    renderWithIntl(await Header({ locale: "en" }));

    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
  });

  it("renders right to left in Arabic with every label translated", async () => {
    renderWithIntl(await Header({ locale: "ar" }), "ar");

    const banner = screen.getByRole("banner");
    expect(
      within(banner).getByRole("link", { name: "Shaheen Sky، الصفحة الرئيسية" }),
    ).toHaveAttribute("href", "/ar");
    expect(within(banner).getByRole("link", { name: "أرسل استفسارًا" })).toHaveAttribute(
      "href",
      "/ar/inquiry",
    );
    expect(within(banner).getByRole("navigation", { name: "التنقل الرئيسي" })).toBeInTheDocument();
    expect(within(banner).getByRole("link", { name: "من نحن" })).toHaveAttribute(
      "href",
      "/ar/about",
    );
  });
});
