import { render, screen, within } from "@testing-library/react";
import type { Locale } from "@/i18n/locales";
import { ArticleCard, type ArticleCardLabels } from "./ArticleCard";
import { ArticleMeta, type ArticleMetaLabels } from "./ArticleMeta";
import { CategoryFilter } from "./CategoryFilter";
import { TagFilterNotice } from "./TagFilterNotice";
import { makeSummary } from "./test-utils";

vi.mock("@/i18n/navigation", async () => (await import("./test-utils")).navigationMock);

const META_LABELS: ArticleMetaLabels = {
  published: "Published",
  category: "Category",
  tags: "Tags",
};
const CARD_LABELS: ArticleCardLabels = { ...META_LABELS, readArticle: "Read article" };
const ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("ArticleMeta", () => {
  const category = { slug: "company-updates", name: "Company updates" };
  const tags = [
    { slug: "logistics", name: "Logistics" },
    { slug: "sourcing", name: "Sourcing" },
  ];

  it("compact: category and date as plain text, no links (the card is the link)", () => {
    render(
      <ArticleMeta
        variant="compact"
        locale="en"
        publishedAt="2026-09-30T02:00:00.000Z"
        category={category}
        tags={tags}
        labels={META_LABELS}
      />,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Company updates")).toBeInTheDocument();
    const time = document.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-09-30T02:00:00.000Z");
    expect(time).toHaveTextContent("September 30, 2026");
  });

  it("full: byline, date, and links to the filtered lists", () => {
    render(
      <ArticleMeta
        locale="en"
        publishedAt="2026-09-30T02:00:00.000Z"
        byline={
          <>
            By <bdi>Editorial team</bdi>
          </>
        }
        category={category}
        tags={tags}
        labels={META_LABELS}
      />,
    );

    expect(screen.getByText("Editorial team").tagName).toBe("BDI");
    expect(screen.getByRole("link", { name: /Company updates/ })).toHaveAttribute(
      "href",
      "/en/news?category=company-updates",
    );
    const list = screen.getByRole("list", { name: "Tags" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/en/news?tag=logistics", "/en/news?tag=sourcing"]);
  });

  it("full: leaves out what the article does not have", () => {
    render(<ArticleMeta locale="en" publishedAt="2026-09-30T02:00:00.000Z" labels={META_LABELS} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
    expect(document.querySelector("time")).toBeInTheDocument();
  });

  it.each([
    ["en", "September 30, 2026"],
    ["zh", "2026年9月30日"],
    ["ar", "30 سبتمبر 2026"],
  ] as [Locale, string][])("formats the date for %s", (locale, expected) => {
    render(
      <ArticleMeta
        variant="compact"
        locale={locale}
        publishedAt="2026-09-30T02:00:00.000Z"
        labels={META_LABELS}
      />,
    );

    expect(document.querySelector("time")).toHaveTextContent(expected);
  });

  it("gives the date and category a spoken label", () => {
    render(
      <ArticleMeta
        variant="compact"
        locale="en"
        publishedAt="2026-09-30T02:00:00.000Z"
        category={category}
        labels={META_LABELS}
      />,
    );

    expect(screen.getByText("Published:")).toHaveClass("sr-only");
    expect(screen.getByText("Category:")).toHaveClass("sr-only");
  });
});

describe("ArticleCard", () => {
  it("is one link, named by the title, that opens the article", () => {
    render(
      <ul>
        <ArticleCard
          locale="en"
          labels={CARD_LABELS}
          article={makeSummary({
            slug: "port-update",
            title: "A port update",
            summary: "What changed at the port.",
          })}
        />
      </ul>,
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("A port update");
    expect(links[0]).toHaveAttribute("href", "/en/news/port-update");
    expect(screen.getByRole("heading", { level: 3, name: "A port update" })).toBeInTheDocument();
    expect(screen.getByText("What changed at the port.")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("encodes a Chinese slug in the address", () => {
    render(
      <ul>
        <ArticleCard
          locale="zh"
          labels={CARD_LABELS}
          article={makeSummary({ slug: "公司动态", title: "公司动态" })}
        />
      </ul>,
    );

    expect(screen.getByRole("link").getAttribute("href")).toMatch(
      new RegExp(`/news/${encodeURIComponent("公司动态")}$`),
    );
  });

  it("can take the h2 level when the page outline needs it", () => {
    render(
      <ul>
        <ArticleCard locale="en" labels={CARD_LABELS} headingLevel="h2" article={makeSummary()} />
      </ul>,
    );

    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("shows a decorative cover only when the article has one", () => {
    const { container, rerender } = render(
      <ul>
        <ArticleCard locale="en" labels={CARD_LABELS} article={makeSummary()} />
      </ul>,
    );
    expect(container.querySelector("img")).toBeNull();

    rerender(
      <ul>
        <ArticleCard
          locale="en"
          labels={CARD_LABELS}
          article={makeSummary({
            cover: { src: `/media/${ID}`, width: 800, height: 450, alt: "Ship" },
          })}
        />
      </ul>,
    );
    const image = container.querySelector("img");
    expect(image?.getAttribute("src")).toContain(encodeURIComponent(`/media/${ID}`));
    // The title already says what the card is about, so the cover is not announced twice.
    expect(image).toHaveAttribute("alt", "");
  });

  it("keeps the visual call to action out of the accessibility tree", () => {
    render(
      <ul>
        <ArticleCard locale="en" labels={CARD_LABELS} article={makeSummary()} />
      </ul>,
    );

    expect(screen.getByText("Read article").closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByRole("link")).toHaveAccessibleName("Sample article title");
  });
});

describe("CategoryFilter", () => {
  const categories = [
    { slug: "company-updates", name: "Company updates", count: 4 },
    { slug: "logistics", name: "Logistics", count: 12 },
  ];
  const labels = { heading: "Categories", all: "All articles" };

  it("renders nothing when there is no category to choose", () => {
    const { container } = render(<CategoryFilter categories={[]} labels={labels} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("links to the unfiltered list and to each category, with counts", () => {
    render(<CategoryFilter categories={categories} labels={labels} />);

    const nav = screen.getByRole("navigation", { name: "Categories" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/en/news",
      "/en/news?category=company-updates",
      "/en/news?category=logistics",
    ]);
    expect(within(nav).getByText("12").tagName).toBe("BDI");
  });

  it("marks 'all' as current when nothing is selected", () => {
    render(<CategoryFilter categories={categories} labels={labels} />);

    expect(screen.getByRole("link", { name: "All articles" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /Logistics/ })).not.toHaveAttribute("aria-current");
  });

  it("marks the selected category as current, whatever the case of the address", () => {
    render(<CategoryFilter categories={categories} activeSlug="Logistics" labels={labels} />);

    expect(screen.getByRole("link", { name: /Logistics/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "All articles" })).not.toHaveAttribute("aria-current");
  });

  it("gives every link a 44px target", () => {
    render(<CategoryFilter categories={categories} labels={labels} />);

    for (const link of screen.getAllByRole("link")) expect(link).toHaveClass("min-h-11");
  });
});

describe("TagFilterNotice", () => {
  it("says what is filtered and links back to the full list", () => {
    render(
      <TagFilterNotice
        notice={
          <>
            Showing articles tagged <strong>Logistics</strong>.
          </>
        }
        clearLabel="Show all articles"
        clearHref="/news"
      />,
    );

    expect(screen.getByText("Logistics").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "Show all articles" })).toHaveAttribute(
      "href",
      "/en/news",
    );
  });
});
