import { render, screen } from "@testing-library/react";
import { ButtonLink } from "./button-link";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

describe("ButtonLink", () => {
  it("is a locale-aware link styled as a button for internal paths", () => {
    render(
      <ButtonLink href="/inquiry" variant="gold" size="lg">
        Send an inquiry
      </ButtonLink>,
    );
    const link = screen.getByRole("link", { name: "Send an inquiry" });
    expect(link).toHaveAttribute("data-locale-link", "true");
    expect(link).toHaveAttribute("href", "/en/inquiry");
    expect(link).toHaveClass("bg-gold-400", "h-13", "rounded-md");
  });

  it("is a plain anchor with rel noopener noreferrer for external URLs", () => {
    render(<ButtonLink href="https://example.com/docs">Docs</ButtonLink>);
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).not.toHaveAttribute("data-locale-link");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveClass("bg-navy-900");
  });

  it("uses the primary/md look by default", () => {
    render(<ButtonLink href="/about">About</ButtonLink>);
    expect(screen.getByRole("link")).toHaveClass("bg-navy-900", "h-11");
  });
});
