import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductRichText } from "./ProductRichText";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

function renderText(
  text: string,
  options: { contentLocale?: "en" | "ar"; locale?: "en" | "ar" } = {},
) {
  return render(
    <ProductRichText
      text={text}
      contentLocale={options.contentLocale ?? "en"}
      locale={options.locale ?? "en"}
    />,
  );
}

describe("ProductRichText", () => {
  it("renders plain paragraphs", () => {
    renderText("First paragraph.\n\nSecond paragraph.");
    expect(screen.getAllByText(/paragraph\./)).toHaveLength(2);
  });

  it("renders Markdown emphasis and lists", () => {
    renderText("A **strong** claim and *emphasis*.\n\n- one\n- two\n\n1. first\n2. second");
    expect(screen.getByText("strong").tagName).toBe("STRONG");
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("never renders raw HTML: scripts, handlers and tags are dropped", () => {
    const { container } = renderText(
      'Before <script>window.__pwned = true</script> <img src=x onerror="window.__pwned = true"> <b>bold?</b> after',
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.innerHTML).not.toMatch(/onerror/i);
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it("strips unsafe link schemes and keeps the text", () => {
    renderText("[click me](javascript:alert(1)) and [data](data:text/html,<b>x</b>)");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/click me/)).toBeInTheDocument();
  });

  it("does not render Markdown images: pictures belong to the gallery", () => {
    const { container } = renderText("![a photo](https://example.com/photo.png) text");
    expect(container.querySelector("img")).toBeNull();
  });

  it("keeps the page outline: Markdown headings become h3 and h4, never h1 or h2", () => {
    const { container } = renderText("# One\n\n## Two\n\n### Three\n\n#### Four\n\n###### Six");
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("h2")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent)).toEqual([
      "One",
      "Two",
      "Three",
    ]);
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(2);
  });

  it("makes external links safe and routes internal links through the locale-aware link", () => {
    renderText("[the site](https://example.com/page) and [inquiry](/inquiry)");
    const external = screen.getByRole("link", { name: "the site" });
    expect(external).toHaveAttribute("href", "https://example.com/page");
    expect(external).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByRole("link", { name: "inquiry" })).toHaveAttribute("href", "/en/inquiry");
  });

  it("marks text that is in another language than the page", () => {
    const { container } = renderText("English text", { contentLocale: "en", locale: "ar" });
    expect(container.firstElementChild).toHaveAttribute("lang", "en");
    expect(container.firstElementChild).toHaveAttribute("dir", "ltr");
  });

  it("adds no language attributes for text in the page language", () => {
    const { container } = renderText("Text", { contentLocale: "en", locale: "en" });
    expect(container.firstElementChild).not.toHaveAttribute("lang");
  });
});
