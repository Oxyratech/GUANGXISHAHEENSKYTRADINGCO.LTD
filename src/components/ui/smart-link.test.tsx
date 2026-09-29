import { render, screen } from "@testing-library/react";
import { isExternalHref, isLocalisedInternalHref, SmartLink } from "./smart-link";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

describe("href classification", () => {
  it.each(["/", "/about", "/business/import-export", "/products?page=2", "/faq#shipping"])(
    "sends %s through the locale-aware Link",
    (href) => {
      expect(isLocalisedInternalHref(href)).toBe(true);
    },
  );

  it.each([
    "https://example.com",
    "//cdn.example.com/a",
    "mailto:hello@example.com",
    "tel:+8600000000",
    "#contact",
    "?page=2",
    "/api/health",
    "/admin/login",
    "/media/abc",
    "/files/abc",
    "/documents/business-license.png",
    "/sitemap.xml",
  ])("keeps %s as a plain anchor", (href) => {
    expect(isLocalisedInternalHref(href)).toBe(false);
  });

  it("recognises absolute and protocol-relative URLs as external", () => {
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("//example.com")).toBe(true);
    expect(isExternalHref("/about")).toBe(false);
  });
});

describe("SmartLink", () => {
  it("renders internal paths with the locale-aware Link", () => {
    render(<SmartLink href="/about">About</SmartLink>);
    const link = screen.getByRole("link", { name: "About" });
    expect(link).toHaveAttribute("data-locale-link", "true");
    expect(link).toHaveAttribute("href", "/en/about");
  });

  it("renders external http(s) URLs as anchors with noopener noreferrer, keeping caller rel tokens", () => {
    render(
      <SmartLink href="https://example.com" rel="author" target="_blank">
        Elsewhere
      </SmartLink>,
    );
    const link = screen.getByRole("link", { name: "Elsewhere" });
    expect(link).not.toHaveAttribute("data-locale-link");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link.getAttribute("rel")?.split(" ").sort()).toEqual([
      "author",
      "noopener",
      "noreferrer",
    ]);
  });

  it("does not add rel to mailto: and file links", () => {
    render(
      <>
        <SmartLink href="mailto:hello@example.com">Mail</SmartLink>
        <SmartLink href="/documents/license.png">License</SmartLink>
      </>,
    );
    expect(screen.getByRole("link", { name: "Mail" })).not.toHaveAttribute("rel");
    expect(screen.getByRole("link", { name: "License" })).not.toHaveAttribute("data-locale-link");
  });
});
