import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigation, resetNavigation } from "@/components/site/test-utils";
import LocaleNotFound, { generateMetadata } from "./not-found";

vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/site/test-utils")).navigationMock,
);
vi.mock(
  "next-intl/server",
  async () => (await import("@/components/site/test-utils")).intlServerMock,
);

beforeEach(() => resetNavigation("/does-not-exist"));

describe("LocaleNotFound", () => {
  it("explains that the page does not exist, under the page's only h1", async () => {
    render(await LocaleNotFound());

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(screen.getByText(/does not exist, or it may have moved/)).toBeInTheDocument();
  });

  it("leads back to the home page and the contact page", async () => {
    render(await LocaleNotFound());

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/en");
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/en/contact");
  });

  it("lists the main sections as helpful links, every one a real route", async () => {
    render(await LocaleNotFound());

    const list = within(screen.getByRole("navigation", { name: "Helpful links" }));
    expect(list.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/en/business",
      "/en/products",
      "/en/global-trade",
      "/en/company-information",
      "/en/contact",
    ]);
  });

  it("is written in the visitor's language", async () => {
    navigation.locale = "zh";
    render(await LocaleNotFound());

    expect(screen.getByRole("heading", { level: 1, name: "页面未找到" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回首页" })).toHaveAttribute("href", "/zh");
  });

  it("titles the tab after the error and the site", async () => {
    await expect(generateMetadata()).resolves.toEqual({
      title: { absolute: "Page not found | Shaheen Sky" },
    });
  });
});
