import { render, screen } from "@testing-library/react";
import { ArticleBody, type BodyImage } from "./ArticleBody";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

const LABELS = { opensInNewTab: "opens in a new tab" };
const ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const IMAGES: Record<string, BodyImage> = { [ID]: { width: 800, height: 600, alt: "Library alt" } };

function renderBody(markdown: string, images: Record<string, BodyImage> = {}) {
  return render(<ArticleBody markdown={markdown} images={images} labels={LABELS} />);
}

describe("ArticleBody: structure", () => {
  it("moves every heading down one level so the article title stays the only h1", () => {
    renderBody("# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six");

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    const levels = screen
      .getAllByRole("heading")
      .map((heading) => [heading.textContent, heading.tagName]);
    expect(levels).toEqual([
      ["One", "H2"],
      ["Two", "H3"],
      ["Three", "H4"],
      ["Four", "H5"],
      ["Five", "H6"],
      ["Six", "H6"],
    ]);
  });

  it("renders paragraphs, emphasis, lists and quotes inside the shared prose typography", () => {
    const { container } = renderBody(
      "A paragraph with **strong** and *emphasis*.\n\n- first\n- second\n\n> quoted words",
    );

    expect(container.firstElementChild).toHaveClass("max-w-[68ch]");
    expect(screen.getByText("strong").tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(container.querySelector("blockquote")).toHaveTextContent("quoted words");
  });

  it("keeps code left-to-right and reachable by keyboard, so it works inside Arabic text", () => {
    const { container } = renderBody("مثال:\n\n```\nnpm run build\n```");

    const block = container.querySelector("pre");
    expect(block).toHaveAttribute("dir", "ltr");
    expect(block).toHaveAttribute("tabindex", "0");
  });
});

describe("ArticleBody: raw HTML is never rendered", () => {
  it.each([
    ["a script element", "before\n\n<script>window.hacked = 1</script>\n\nafter", "script"],
    ["an iframe", '<iframe src="https://example.com"></iframe>', "iframe"],
    ["inline bold", "some <b>bold</b> text", "b"],
    ["a style element", "<style>body{display:none}</style>", "style"],
    ["a form", '<form action="/x"><input name="a"></form>', "form"],
  ])("drops %s", (_label, markdown, selector) => {
    const { container } = renderBody(markdown);

    expect(container.querySelector(selector)).toBeNull();
  });

  it("drops event-handler attributes on raw tags", () => {
    const { container } = renderBody(
      '<img src="x" onerror="window.hacked = 1"> <a href="/x" onclick="1">go</a>',
    );

    expect(container.querySelector("[onerror], [onclick]")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("does not show the markup as text either", () => {
    renderBody("safe\n\n<script>window.hacked = 1</script>");

    expect(screen.queryByText(/hacked/)).toBeNull();
    expect(screen.getByText("safe")).toBeInTheDocument();
  });
});

describe("ArticleBody: links", () => {
  it.each([
    ["javascript:", "[click me](javascript:window.hacked=1)"],
    ["javascript: in mixed case", "[click me](JaVaScRiPt:window.hacked=1)"],
    ["vbscript:", "[click me](vbscript:msgbox)"],
    ["data:", "[click me](data:text/html;base64,PHNjcmlwdD4=)"],
    ["a protocol-relative address", "[click me](//example.com/x)"],
    ["a bare relative path", "[click me](docs/page)"],
    ["an empty address", "[click me]()"],
    ["ftp:", "[click me](ftp://example.com/file)"],
  ])("neutralises %s: the words stay, the link goes", (_label, markdown) => {
    const { container } = renderBody(markdown);

    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("click me")).toBeInTheDocument();
  });

  it("opens other sites in a new tab with noopener noreferrer and says so", () => {
    renderBody('[Registry](https://www.gsxt.gov.cn/ "Official registry")');

    const link = screen.getByRole("link", { name: /Registry/ });
    expect(link).toHaveAttribute("href", "https://www.gsxt.gov.cn/");
    expect(link).toHaveAttribute("target", "_blank");
    const rel = (link.getAttribute("rel") ?? "").split(" ");
    expect(rel).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    expect(link).toHaveAccessibleName(/^Registry\s*\(opens in a new tab\)$/);
    expect(link).toHaveAttribute("title", "Official registry");
  });

  it("forces rel on http links and autolinks as well", () => {
    renderBody("<http://example.com/a> and [b](http://example.com/b)");

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("rel")).toContain("noreferrer");
    }
  });

  it("keeps site paths inside the site and locale-aware, in the same tab", () => {
    renderBody("[Send an inquiry](/inquiry) and [a brochure](/media/" + ID + ")");

    const inquiry = screen.getByRole("link", { name: "Send an inquiry" });
    expect(inquiry).toHaveAttribute("href", "/en/inquiry");
    expect(inquiry).not.toHaveAttribute("target");
    // Media is never locale-prefixed.
    expect(screen.getByRole("link", { name: "a brochure" })).toHaveAttribute(
      "href",
      `/media/${ID}`,
    );
  });

  it("allows in-page anchors, mailto: and tel:", () => {
    renderBody("[top](#top) [mail](mailto:hello@example.com) [call](tel:+8613800000000)");

    expect(screen.getByRole("link", { name: "top" })).toHaveAttribute("href", "#top");
    expect(screen.getByRole("link", { name: "mail" })).toHaveAttribute(
      "href",
      "mailto:hello@example.com",
    );
    expect(screen.getByRole("link", { name: "call" })).toHaveAttribute(
      "href",
      "tel:+8613800000000",
    );
    expect(screen.getByRole("link", { name: "mail" })).not.toHaveAttribute("target");
  });
});

describe("ArticleBody: images", () => {
  it("draws a library image that the repository reported as public", () => {
    const { container } = renderBody(`![A container ship](/media/${ID} "Photo: our own")`, IMAGES);

    const image = screen.getByRole("img", { name: "A container ship" });
    expect(image.getAttribute("src")).toContain(encodeURIComponent(`/media/${ID}`));
    expect(image).toHaveAttribute("width", "800");
    expect(image).toHaveAttribute("height", "600");
    expect(container).toHaveTextContent("Photo: our own");
  });

  it("falls back to the alt text of the media library, then to a decorative image", () => {
    renderBody(`![](/media/${ID})`, IMAGES);
    expect(screen.getByRole("img", { name: "Library alt" })).toBeInTheDocument();
  });

  it("is decorative when there is no alt text anywhere", () => {
    const { container } = renderBody(`![](/media/${ID})`, {
      [ID]: { width: 1, height: 1, alt: null },
    });

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("copes with a library image of unknown size", () => {
    const { container } = renderBody(`![x](/media/${ID})`, {
      [ID]: { width: null, height: null, alt: null },
    });

    expect(container.querySelector("img")).toHaveAttribute("width", "1600");
  });

  it("matches the id whatever its case", () => {
    renderBody(`![Upper](/media/${ID.toUpperCase()})`, IMAGES);

    expect(screen.getByRole("img", { name: "Upper" })).toBeInTheDocument();
  });

  it("draws nothing for an asset the repository did not report (private, missing, not an image)", () => {
    const { container } = renderBody(`![Secret](/media/${ID})`, {});

    expect(container.querySelector("img")).toBeNull();
  });

  it("never embeds a remote image: it is offered as a link that opens safely", () => {
    const { container } = renderBody("![Chart of prices](https://example.com/chart.png)");

    expect(container.querySelector("img")).toBeNull();
    const link = screen.getByRole("link", { name: /Chart of prices/ });
    expect(link).toHaveAttribute("href", "https://example.com/chart.png");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it.each([
    ["a data: URI", "![x](data:image/png;base64,AAAA)"],
    ["a javascript: URI", "![x](javascript:window.hacked=1)"],
    ["another site path", "![x](/brand/logo-mark.svg)"],
    ["a media path with a query", `![x](/media/${ID}?download=1)`],
    ["a media path with a suffix", `![x](/media/${ID}/extra)`],
  ])("draws nothing for %s", (_label, markdown) => {
    const { container } = renderBody(markdown, IMAGES);

    expect(container.querySelector("img, a")).toBeNull();
  });
});
