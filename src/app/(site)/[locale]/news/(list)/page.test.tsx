import { render, screen, within } from "@testing-library/react";
import type { Locale } from "@/i18n/locales";
import { makeSummary, readJsonLd } from "@/components/news/test-utils";
import type { ArticleListPage, NewsCategorySummary, NewsResult } from "@/server/news";

const mocks = vi.hoisted(() => ({
  listPublishedArticles: vi.fn(),
  listCategories: vi.fn(),
  redirect: vi.fn((_target: unknown) => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock(
  "next-intl/server",
  async () => (await import("@/components/news/test-utils")).intlServerMock,
);
vi.mock("@/i18n/navigation", async () => ({
  ...(await import("@/components/news/test-utils")).navigationMock,
  redirect: mocks.redirect,
}));
vi.mock("@/server/news", () => ({
  listPublishedArticles: mocks.listPublishedArticles,
  listCategories: mocks.listCategories,
}));

import NewsPage, { generateMetadata } from "./page";

const SITE = "https://www.example.test";

function pageOf(overrides: Partial<ArticleListPage> = {}): NewsResult<ArticleListPage> {
  const items = overrides.items ?? [];
  return {
    status: "ok",
    data: {
      items,
      total: items.length,
      page: 1,
      pageSize: 9,
      pageCount: items.length > 0 ? 1 : 0,
      activeTag: null,
      ...overrides,
    },
  };
}

const CATEGORIES: NewsCategorySummary[] = [
  { slug: "company-updates", name: "Company updates", count: 2 },
  { slug: "logistics", name: "Logistics", count: 1 },
];

function props(locale: string, searchParams: Record<string, string | string[] | undefined> = {}) {
  return {
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(searchParams),
  } as PageProps<"/[locale]/news">;
}

async function renderPage(
  locale: Locale = "en",
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  return render(await NewsPage(props(locale, searchParams)));
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
  mocks.listPublishedArticles.mockResolvedValue(pageOf());
  mocks.listCategories.mockResolvedValue({ status: "ok", data: [] });
});

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.listPublishedArticles.mockReset();
  mocks.listCategories.mockReset();
  mocks.redirect.mockClear();
});

describe("/news: no articles yet", () => {
  it("says so honestly and points to the business pages and the inquiry form", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "News and updates" })).toBeInTheDocument();
    expect(screen.getByText("No news articles have been published yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore our business" })).toHaveAttribute(
      "href",
      "/en/business",
    );
    expect(screen.getByRole("link", { name: "Send inquiry" })).toHaveAttribute(
      "href",
      "/en/inquiry",
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("has exactly one h1", async () => {
    await renderPage();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it.each([
    ["zh", "暂无已发布的新闻文章。", "新闻动态"],
    ["ar", "لم تُنشر أي مقالات إخبارية بعد.", "الأخبار والمستجدات"],
  ] as [Locale, string, string][])("speaks %s", async (locale, empty, title) => {
    await renderPage(locale);

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(empty)).toBeInTheDocument();
  });

  it("does not invent a collection: only the breadcrumb is structured data", async () => {
    const { container } = await renderPage();

    expect(readJsonLd(container).map((entry) => entry["@type"])).toEqual(["BreadcrumbList"]);
  });
});

describe("/news: database unavailable", () => {
  it("shows an error state, never an empty one that would claim there are no articles", async () => {
    mocks.listPublishedArticles.mockResolvedValue({ status: "unavailable" });
    mocks.listCategories.mockResolvedValue({ status: "unavailable" });

    await renderPage();

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("We could not load the news")).toBeInTheDocument();
    expect(within(alert).getByText(/could not reach our systems/)).toBeInTheDocument();
    expect(within(alert).getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/en/news",
    );
    expect(screen.queryByText("No news articles have been published yet.")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("retries the same page and filters", async () => {
    mocks.listPublishedArticles.mockResolvedValue({ status: "unavailable" });

    await renderPage("en", { category: "logistics", page: "2" });

    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/en/news?category=logistics&page=2",
    );
  });
});

describe("/news: with articles", () => {
  const items = [
    makeSummary({ slug: "one", title: "First story", category: CATEGORIES[0] }),
    makeSummary({ slug: "two", title: "Second story", category: CATEGORIES[1] }),
  ];

  it("lists articles as cards under h3, with the h2 for the section", async () => {
    mocks.listPublishedArticles.mockResolvedValue(pageOf({ items }));

    await renderPage();

    expect(screen.getByRole("heading", { level: 2, name: "Latest articles" })).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /story$/ });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/en/news/one",
      "/en/news/two",
    ]);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
    expect(screen.queryByText("No news articles have been published yet.")).toBeNull();
  });

  it("asks the repository for the visitor's language, page and filters", async () => {
    await renderPage("zh", { page: "2", category: "logistics", tag: "sea" });

    expect(mocks.listPublishedArticles).toHaveBeenCalledWith({
      locale: "zh",
      page: 2,
      pageSize: 9,
      categorySlug: "logistics",
      tagSlug: "sea",
    });
    expect(mocks.listCategories).toHaveBeenCalledWith({ locale: "zh" });
  });

  it("ignores junk in the query string instead of passing it on", async () => {
    await renderPage("en", { page: "-5", category: "a b;c", tag: ["x", "y"] });

    expect(mocks.listPublishedArticles).toHaveBeenCalledWith({
      locale: "en",
      page: 1,
      pageSize: 9,
      categorySlug: undefined,
      tagSlug: "x",
    });
  });

  it("offers the category filter once there is something to choose", async () => {
    mocks.listPublishedArticles.mockResolvedValue(pageOf({ items }));
    mocks.listCategories.mockResolvedValue({ status: "ok", data: CATEGORIES });

    await renderPage();

    const nav = screen.getByRole("navigation", { name: "Categories" });
    expect(within(nav).getByRole("link", { name: "All articles" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: /Logistics/ })).toHaveAttribute(
      "href",
      "/en/news?category=logistics",
    );
  });

  it("hides the filter when there is a single category and none is selected", async () => {
    mocks.listPublishedArticles.mockResolvedValue(pageOf({ items }));
    mocks.listCategories.mockResolvedValue({ status: "ok", data: [CATEGORIES[0]] });

    await renderPage();

    expect(screen.queryByRole("navigation", { name: "Categories" })).toBeNull();
  });

  it("paginates with crawlable links that keep the filters", async () => {
    mocks.listPublishedArticles.mockResolvedValue(
      pageOf({ items, total: 25, page: 2, pageCount: 3 }),
    );
    mocks.listCategories.mockResolvedValue({ status: "ok", data: CATEGORIES });

    await renderPage("en", { page: "2", category: "logistics" });

    const pagination = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(pagination).getByRole("link", { name: /Previous/ })).toHaveAttribute(
      "href",
      "/en/news?category=logistics",
    );
    expect(within(pagination).getByRole("link", { name: /Next/ })).toHaveAttribute(
      "href",
      "/en/news?category=logistics&page=3",
    );
    expect(
      within(pagination).getByText("2", { selector: "[aria-current=page]" }),
    ).toBeInTheDocument();
  });

  it("describes the collection in structured data on the first page only", async () => {
    mocks.listPublishedArticles.mockResolvedValue(pageOf({ items }));

    const first = await renderPage();
    const data = readJsonLd(first.container);
    expect(data.map((entry) => entry["@type"])).toEqual(["BreadcrumbList", "CollectionPage"]);
    expect(JSON.stringify(data[1])).toContain(`${SITE}/en/news/one`);
    first.unmount();

    mocks.listPublishedArticles.mockResolvedValue(pageOf({ items, page: 2, pageCount: 2 }));
    const second = await renderPage("en", { page: "2" });
    expect(readJsonLd(second.container).map((entry) => entry["@type"])).toEqual(["BreadcrumbList"]);
  });
});

describe("/news: filters", () => {
  it("names the tag being filtered and offers the way back", async () => {
    mocks.listPublishedArticles.mockResolvedValue(
      pageOf({
        items: [makeSummary()],
        activeTag: { slug: "sea-freight", name: "Sea freight" },
      }),
    );

    await renderPage("en", { tag: "sea-freight" });

    // Emphasised, and isolated so a Latin tag name does not reorder the Arabic sentence around it.
    const name = screen.getByText("Sea freight");
    expect(name.tagName).toBe("BDI");
    expect(name.closest("strong")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Show all articles" })).toHaveAttribute(
      "href",
      "/en/news",
    );
  });

  it("says nothing matches, and links back, rather than claiming nothing was ever published", async () => {
    mocks.listPublishedArticles.mockResolvedValue(pageOf());
    mocks.listCategories.mockResolvedValue({ status: "ok", data: CATEGORIES });

    await renderPage("en", { category: "logistics" });

    expect(screen.getByText("No articles match this filter.")).toBeInTheDocument();
    expect(screen.queryByText("No news articles have been published yet.")).toBeNull();
    expect(screen.getByRole("link", { name: "View all news" })).toHaveAttribute("href", "/en/news");
    // The category list stays, so the visitor can pick another one.
    expect(screen.getByRole("navigation", { name: "Categories" })).toBeInTheDocument();
  });

  it("goes to the last page when the requested page is past the end", async () => {
    mocks.listPublishedArticles.mockResolvedValue(
      pageOf({ items: [makeSummary()], page: 9, pageCount: 2 }),
    );

    await expect(NewsPage(props("en", { page: "9", category: "logistics" }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.redirect).toHaveBeenCalledWith({
      href: "/news?category=logistics&page=2",
      locale: "en",
    });
  });

  it("does not redirect an empty result", async () => {
    mocks.listPublishedArticles.mockResolvedValue(pageOf({ page: 4 }));

    await renderPage("en", { page: "4" });

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(screen.getByText("No news articles have been published yet.")).toBeInTheDocument();
  });
});

describe("/news: metadata", () => {
  const meta = (locale: string, searchParams: Record<string, string> = {}) =>
    generateMetadata(props(locale, searchParams));

  it("titles and describes the page from the news namespace", async () => {
    const metadata = await meta("en");

    expect(metadata.title).toEqual({ absolute: "News and updates | Shaheen Sky" });
    expect(metadata.description).toContain("Guangxi Shaheen Sky Trading Co., Ltd.");
    expect(metadata.alternates?.canonical).toBe(`${SITE}/en/news`);
    expect(Object.keys(metadata.alternates?.languages ?? {}).sort()).toEqual([
      "ar",
      "en",
      "x-default",
      "zh-CN",
    ]);
    expect(metadata.robots).toBeUndefined();
  });

  it("gives each further page its own title and canonical address", async () => {
    const metadata = await meta("en", { page: "2" });

    expect(metadata.title).toEqual({ absolute: "News and updates, page 2 | Shaheen Sky" });
    expect(metadata.alternates?.canonical).toBe(`${SITE}/en/news?page=2`);
    expect(metadata.robots).toBeUndefined();
  });

  it("keeps filtered views out of the index", async () => {
    const filters: Record<string, string>[] = [
      { category: "logistics" },
      { tag: "sea", page: "2" },
    ];
    for (const searchParams of filters) {
      const metadata = await meta("zh", searchParams);
      expect(metadata.robots).toEqual({ index: false, follow: false });
      expect(metadata.alternates?.canonical).toBe(`${SITE}/zh/news`);
    }
  });

  it.each([
    ["zh", "新闻动态 | Shaheen Sky"],
    ["ar", "الأخبار والمستجدات | Shaheen Sky"],
  ])("is translated for %s", async (locale, title) => {
    expect((await meta(locale)).title).toEqual({ absolute: title });
  });
});
