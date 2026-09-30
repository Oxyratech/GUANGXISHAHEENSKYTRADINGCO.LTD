import { render, screen, within } from "@testing-library/react";
import type { Locale } from "@/i18n/locales";
import { makeArticle, makeSummary, readJsonLd } from "@/components/news/test-utils";
import type { PublishedArticle } from "@/server/news";

const mocks = vi.hoisted(() => ({
  getPublishedArticle: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock(
  "next-intl/server",
  async () => (await import("@/components/news/test-utils")).intlServerMock,
);
vi.mock(
  "@/i18n/navigation",
  async () => (await import("@/components/news/test-utils")).navigationMock,
);
vi.mock("@/server/news", () => ({ getPublishedArticle: mocks.getPublishedArticle }));
// The real component registers paths with the language switcher on the client.
vi.mock("@/components/site/alternate-locale-paths", () => ({
  AlternateLocalePaths: ({ paths }: { paths: unknown }) => (
    <div data-testid="alternate-paths" data-paths={JSON.stringify(paths)} />
  ),
}));

import NewsArticlePage, { generateMetadata } from "./page";

const SITE = "https://www.example.test";
const MEDIA_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

function props(locale: string, slug: string) {
  return { params: Promise.resolve({ locale, slug }) } as PageProps<"/[locale]/news/[slug]">;
}

function resolves(article: PublishedArticle | null) {
  mocks.getPublishedArticle.mockResolvedValue({ status: "ok", data: article });
}

async function renderArticle(locale: Locale = "en", slug = "sample-article") {
  return render(await NewsArticlePage(props(locale, slug)));
}

const alternatePaths = () =>
  JSON.parse(screen.getByTestId("alternate-paths").getAttribute("data-paths") ?? "null") as Record<
    string,
    string
  >;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
  resolves(makeArticle());
});

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.getPublishedArticle.mockReset();
  mocks.notFound.mockClear();
});

describe("/news/[slug]: missing articles", () => {
  it("is a 404 when the article is missing, a draft, archived, scheduled or in another language", async () => {
    resolves(null);

    await expect(NewsArticlePage(props("en", "no-such-story"))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(generateMetadata(props("en", "no-such-story"))).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.getPublishedArticle).toHaveBeenCalledWith({ locale: "en", slug: "no-such-story" });
  });

  it.each(["a b", "..", "a/b", "<script>", "-x", "%E0%A4%A"])(
    "is a 404, without a database query, for the slug %j",
    async (slug) => {
      await expect(NewsArticlePage(props("en", slug))).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mocks.getPublishedArticle).not.toHaveBeenCalled();
    },
  );

  it("is a 404 for an unknown language", async () => {
    await expect(NewsArticlePage(props("xx", "sample-article"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("looks the article up in the visitor's language with the decoded slug", async () => {
    resolves(makeArticle({ slug: "公司动态", locale: "zh" }));

    await renderArticle("zh", encodeURIComponent("公司动态"));

    expect(mocks.getPublishedArticle).toHaveBeenCalledWith({ locale: "zh", slug: "公司动态" });
  });
});

describe("/news/[slug]: database unavailable", () => {
  beforeEach(() => {
    mocks.getPublishedArticle.mockResolvedValue({ status: "unavailable" });
  });

  it("shows an honest error state with the only h1, and a way to retry or go back", async () => {
    await renderArticle();

    const alert = screen.getByRole("alert");
    expect(
      within(alert).getByRole("heading", { level: 1, name: "We could not load the news" }),
    ).toBeInTheDocument();
    expect(within(alert).getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/en/news/sample-article",
    );
    expect(within(alert).getByRole("link", { name: "Back to all news" })).toHaveAttribute(
      "href",
      "/en/news",
    );
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("sends the language switcher to the list, which exists in every language", async () => {
    await renderArticle();

    expect(alternatePaths()).toEqual({ en: "/news", zh: "/news", ar: "/news" });
  });

  it("keeps the page out of the index", async () => {
    const metadata = await generateMetadata(props("en", "sample-article"));

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("/news/[slug]: an article", () => {
  const article = makeArticle({
    title: "Port schedule update",
    summary: "What changed at the port this month.",
    authorName: "Editorial team",
    category: { slug: "company-updates", name: "Company updates" },
    tags: [{ slug: "logistics", name: "Logistics" }],
    content: "# A section\n\nBody paragraph with [a link](/inquiry).",
  });

  it("has one h1, the article title, and shifts the body headings below it", async () => {
    resolves(article);

    await renderArticle();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Port schedule update" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "A section" })).toBeInTheDocument();
    expect(screen.getByText("What changed at the port this month.")).toBeInTheDocument();
  });

  it("shows the byline, the published date, the category and the tags", async () => {
    resolves(article);

    await renderArticle();

    expect(screen.getByText("Editorial team").tagName).toBe("BDI");
    expect(document.querySelector("time")).toHaveAttribute("datetime", "2026-09-30T02:00:00.000Z");
    expect(screen.getByRole("link", { name: /Company updates/ })).toHaveAttribute(
      "href",
      "/en/news?category=company-updates",
    );
    expect(screen.getByRole("link", { name: "Logistics" })).toHaveAttribute(
      "href",
      "/en/news?tag=logistics",
    );
  });

  it("has no byline when the editor gave none", async () => {
    resolves(makeArticle({ authorName: null }));

    await renderArticle();

    expect(screen.queryByText(/^By /)).toBeNull();
  });

  it("breadcrumbs back through the news list to the home page", async () => {
    resolves(article);

    await renderArticle();

    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      within(trail)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Home", "News", "Port schedule update"]);
    expect(within(trail).getByRole("link", { name: "News" })).toHaveAttribute("href", "/en/news");
  });

  it("closes with a link back to the list and a call to action that leads somewhere real", async () => {
    resolves(article);

    await renderArticle();

    expect(screen.getAllByRole("link", { name: "Back to all news" })[0]).toHaveAttribute(
      "href",
      "/en/news",
    );
    expect(screen.getByRole("link", { name: "Send inquiry" })).toHaveAttribute(
      "href",
      "/en/inquiry",
    );
    expect(screen.getByRole("link", { name: "Explore our business" })).toHaveAttribute(
      "href",
      "/en/business",
    );
  });

  it("shows the cover image with alt text", async () => {
    resolves(
      makeArticle({
        cover: {
          src: `/media/${MEDIA_ID}`,
          width: 1600,
          height: 900,
          alt: "Container ship at berth",
        },
      }),
    );

    await renderArticle();

    const cover = screen.getByRole("img", { name: "Container ship at berth" });
    expect(cover.getAttribute("src")).toContain(encodeURIComponent(`/media/${MEDIA_ID}`));
  });

  it("falls back to the title as the cover's alt text", async () => {
    resolves(
      makeArticle({
        title: "Port schedule update",
        cover: { src: `/media/${MEDIA_ID}`, width: null, height: null, alt: null },
      }),
    );

    await renderArticle();

    expect(screen.getByRole("img", { name: "Port schedule update" })).toBeInTheDocument();
  });

  it("draws body images only from the ones the repository vouched for", async () => {
    resolves(
      makeArticle({
        content: `![Warehouse floor](/media/${MEDIA_ID})\n\n![Elsewhere](https://example.com/x.png)`,
        bodyImages: {
          [MEDIA_ID]: { src: `/media/${MEDIA_ID}`, width: 800, height: 600, alt: null },
        },
      }),
    );

    await renderArticle();

    expect(screen.getByRole("img", { name: "Warehouse floor" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Elsewhere" })).toBeNull();
    expect(screen.getByRole("link", { name: /Elsewhere/ })).toHaveAttribute(
      "href",
      "https://example.com/x.png",
    );
  });

  it("lists related articles under an h2, each with an h3 title", async () => {
    resolves(
      makeArticle({
        related: [
          makeSummary({ slug: "r1", title: "Related one" }),
          makeSummary({ slug: "r2", title: "Related two" }),
        ],
      }),
    );

    await renderArticle();

    expect(screen.getByRole("heading", { level: 2, name: "More news" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Related one" })).toHaveAttribute(
      "href",
      "/en/news/r1",
    );
    expect(screen.getByRole("heading", { level: 3, name: "Related two" })).toBeInTheDocument();
  });

  it("has no related section without related articles", async () => {
    await renderArticle();

    expect(screen.queryByRole("heading", { name: "More news" })).toBeNull();
  });

  it("shares nothing with third parties: no widgets, frames or external scripts", async () => {
    resolves(article);

    const { container } = await renderArticle();

    expect(container.querySelector("iframe, script[src], [src^='http'], form")).toBeNull();
    const external = [...container.querySelectorAll("a[href^='http']")];
    expect(external).toEqual([]);
  });

  it.each([
    ["zh", "作者：", "返回全部新闻"],
    ["ar", "بقلم", "العودة إلى جميع الأخبار"],
  ] as [Locale, string, string][])("is translated for %s", async (locale, byline, back) => {
    resolves(makeArticle({ locale, authorName: "Ahmed", related: [] }));

    await renderArticle(locale);

    expect(screen.getByText(byline, { exact: false })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: back })[0]).toBeInTheDocument();
  });
});

describe("/news/[slug]: language versions", () => {
  it("points the language switcher at the version in each language, and at the list where there is none", async () => {
    resolves(makeArticle({ alternates: { en: "sample-article", zh: "公司动态" } }));

    await renderArticle();

    expect(alternatePaths()).toEqual({
      en: "/news/sample-article",
      zh: `/news/${encodeURIComponent("公司动态")}`,
      ar: "/news",
    });
  });

  it("emits hreflang and canonical only for versions that exist", async () => {
    resolves(makeArticle({ alternates: { en: "sample-article", zh: "gong-si" } }));

    const metadata = await generateMetadata(props("en", "sample-article"));

    expect(metadata.alternates?.canonical).toBe(`${SITE}/en/news/sample-article`);
    expect(metadata.alternates?.languages).toEqual({
      en: `${SITE}/en/news/sample-article`,
      "zh-CN": `${SITE}/zh/news/gong-si`,
      "x-default": `${SITE}/en/news/sample-article`,
    });
  });

  it("has only itself when the story exists in one language", async () => {
    resolves(makeArticle({ locale: "ar", slug: "khabar", alternates: { ar: "khabar" } }));

    const metadata = await generateMetadata(props("ar", "khabar"));

    expect(metadata.alternates?.languages).toEqual({
      ar: `${SITE}/ar/news/khabar`,
      "x-default": `${SITE}/ar/news/khabar`,
    });
  });
});

describe("/news/[slug]: metadata", () => {
  it("is built from the article", async () => {
    resolves(
      makeArticle({
        title: "Port schedule update",
        summary: "What changed at the port.",
        cover: { src: `/media/${MEDIA_ID}`, width: 1600, height: 900, alt: "Ship" },
      }),
    );

    const metadata = await generateMetadata(props("en", "sample-article"));

    expect(metadata.title).toEqual({ absolute: "Port schedule update | Shaheen Sky" });
    expect(metadata.description).toBe("What changed at the port.");
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-09-30T02:00:00.000Z",
      modifiedTime: "2026-09-30T03:00:00.000Z",
      images: [{ url: `${SITE}/media/${MEDIA_ID}`, alt: "Ship", width: 1600, height: 900 }],
    });
    expect(metadata.robots).toBeUndefined();
  });

  it("uses the default social card when the article has no cover", async () => {
    const metadata = await generateMetadata(props("en", "sample-article"));

    expect(JSON.stringify(metadata.openGraph)).toContain("opengraph-image");
  });

  it("honours the editor's SEO override for title, description, share image and noindex", async () => {
    resolves(
      makeArticle({
        seo: {
          title: "Custom SEO title",
          description: "Custom SEO description.",
          noIndex: true,
          image: { src: `/media/${MEDIA_ID}`, width: 1200, height: 630, alt: "Share card" },
        },
        cover: {
          src: "/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          width: 10,
          height: 10,
          alt: null,
        },
      }),
    );

    const metadata = await generateMetadata(props("en", "sample-article"));

    expect(metadata.title).toEqual({ absolute: "Custom SEO title | Shaheen Sky" });
    expect(metadata.description).toBe("Custom SEO description.");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.openGraph).toMatchObject({
      images: [{ url: `${SITE}/media/${MEDIA_ID}`, alt: "Share card" }],
    });
  });

  it("falls back to the article for what the override leaves empty", async () => {
    resolves(
      makeArticle({
        title: "Real title",
        summary: "Real summary.",
        seo: { title: null, description: null, noIndex: false, image: null },
      }),
    );

    const metadata = await generateMetadata(props("en", "sample-article"));

    expect(metadata.title).toEqual({ absolute: "Real title | Shaheen Sky" });
    expect(metadata.description).toBe("Real summary.");
  });
});

describe("/news/[slug]: structured data", () => {
  function articleLd(container: HTMLElement) {
    return readJsonLd(container).find((entry) => entry["@type"] === "NewsArticle");
  }

  it("describes the article from real data only", async () => {
    resolves(
      makeArticle({
        title: "Port schedule update",
        summary: "What changed at the port.",
        authorName: "Editorial team",
        cover: { src: `/media/${MEDIA_ID}`, width: 1600, height: 900, alt: null },
      }),
    );

    const { container } = await renderArticle();

    expect(articleLd(container)).toMatchObject({
      "@type": "NewsArticle",
      headline: "Port schedule update",
      description: "What changed at the port.",
      inLanguage: "en",
      datePublished: "2026-09-30T02:00:00.000Z",
      dateModified: "2026-09-30T03:00:00.000Z",
      image: [`${SITE}/media/${MEDIA_ID}`],
      author: { "@type": "Person", name: "Editorial team" },
      mainEntityOfPage: { "@id": `${SITE}/en/news/sample-article` },
    });
  });

  it("credits the company when there is no byline and leaves out an image it does not have", async () => {
    const { container } = await renderArticle();

    const data = articleLd(container);
    expect(data?.author).toMatchObject({ "@type": "Organization" });
    expect(data).not.toHaveProperty("image");
  });

  it("adds the breadcrumb trail", async () => {
    const { container } = await renderArticle();

    const trail = readJsonLd(container).find((entry) => entry["@type"] === "BreadcrumbList");
    expect(JSON.stringify(trail)).toContain(`${SITE}/en/news/sample-article`);
    expect(JSON.stringify(trail)).toContain(`${SITE}/en/news"`);
  });
});
