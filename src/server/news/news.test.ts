// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn<() => boolean>(),
  getDb: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  categoryFindMany: vi.fn(),
  mediaFindMany: vi.fn(),
  seoFindUnique: vi.fn(),
  warn: vi.fn(),
  // unstable_cache needs the Next.js runtime; here it hands back the function it was given.
  unstableCache: vi.fn(<T>(fn: T) => fn),
}));

vi.mock("next/cache", () => ({ unstable_cache: mocks.unstableCache }));
vi.mock("@/lib/logger", () => ({ logger: { warn: mocks.warn } }));
vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

import { DatabaseUnavailableError } from "@/server/db/errors";
import {
  getPublishedArticle,
  listCategories,
  listPublishedArticles,
  NEWS_CACHE_TAG,
} from "./index";

// Recorded at import time, before any test resets the mock.
const cacheCalls = mocks.unstableCache.mock.calls as unknown as [
  unknown,
  string[],
  { revalidate: number; tags: string[] },
][];

const NOW = new Date("2026-09-30T10:00:00.000Z");
const PUBLISHED_NOW = {
  status: "PUBLISHED",
  OR: [{ publishedAt: null }, { publishedAt: { lte: NOW } }],
};

const names = (slug: string, en: string, zh?: string) => ({
  slug,
  translations: [{ locale: "en", name: en }, ...(zh ? [{ locale: "zh", name: zh }] : [])],
});

function summaryRow(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `id-${slug}`,
    slug,
    title: `Title of ${slug}`,
    summary: `Summary of ${slug}`,
    publishedAt: new Date("2026-09-01T08:00:00.000Z"),
    createdAt: new Date("2026-08-31T08:00:00.000Z"),
    authorName: "Editorial team",
    category: names("updates", "Updates", "动态"),
    tags: [{ tag: names("logistics", "Logistics") }],
    cover: null,
    ...overrides,
  };
}

function detailRow(overrides: Record<string, unknown> = {}) {
  return {
    ...summaryRow("main-story"),
    locale: "en",
    translationGroupId: "group-1",
    categoryId: "cat-1",
    content: "Body of the story.",
    updatedAt: new Date("2026-09-02T08:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  mocks.isDatabaseConfigured.mockReturnValue(true);
  mocks.count.mockResolvedValue(0);
  mocks.findMany.mockResolvedValue([]);
  mocks.findFirst.mockResolvedValue(null);
  mocks.categoryFindMany.mockResolvedValue([]);
  mocks.mediaFindMany.mockResolvedValue([]);
  mocks.seoFindUnique.mockResolvedValue(null);
  mocks.getDb.mockReturnValue({
    newsArticle: { count: mocks.count, findMany: mocks.findMany, findFirst: mocks.findFirst },
    newsCategory: { findMany: mocks.categoryFindMany },
    mediaAsset: { findMany: mocks.mediaFindMany },
    seoMetadata: { findUnique: mocks.seoFindUnique },
  });
});

afterEach(() => {
  vi.useRealTimers();
  mocks.count.mockReset();
  mocks.findMany.mockReset();
  mocks.findFirst.mockReset();
  mocks.categoryFindMany.mockReset();
  mocks.mediaFindMany.mockReset();
  mocks.seoFindUnique.mockReset();
  mocks.warn.mockReset();
  mocks.getDb.mockReset();
});

describe("caching", () => {
  it("caches every read for five minutes under the news tag", () => {
    expect(cacheCalls).toHaveLength(3);
    for (const [, , options] of cacheCalls) {
      expect(options).toEqual({ revalidate: 300, tags: [NEWS_CACHE_TAG] });
    }
    expect(NEWS_CACHE_TAG).toBe("news");
  });
});

describe("listPublishedArticles", () => {
  const query = { locale: "zh", page: 1, pageSize: 9 } as const;

  it("selects published articles in the requested language only, and not scheduled ones", async () => {
    await listPublishedArticles(query);

    const expected = { locale: "zh", ...PUBLISHED_NOW };
    expect(mocks.count).toHaveBeenCalledWith({ where: expected });
    expect(mocks.findMany.mock.calls[0]?.[0].where).toEqual(expected);
  });

  it("lists the newest first, with a stable tie-break", async () => {
    await listPublishedArticles(query);

    expect(mocks.findMany.mock.calls[0]?.[0].orderBy).toEqual([
      { publishedAt: "desc" },
      { createdAt: "desc" },
      { id: "asc" },
    ]);
  });

  it("selects public columns only: no content, no author account, no version", async () => {
    await listPublishedArticles(query);

    const select = mocks.findMany.mock.calls[0]?.[0].select as Record<string, unknown>;
    expect(Object.keys(select).sort()).toEqual(
      [
        "authorName",
        "category",
        "cover",
        "createdAt",
        "id",
        "publishedAt",
        "slug",
        "summary",
        "tags",
        "title",
      ].sort(),
    );
  });

  it("narrows by category and by tag", async () => {
    await listPublishedArticles({ ...query, categorySlug: "updates", tagSlug: "logistics" });

    expect(mocks.findMany.mock.calls[0]?.[0].where).toEqual({
      locale: "zh",
      ...PUBLISHED_NOW,
      category: { is: { slug: "updates" } },
      tags: { some: { tag: { slug: "logistics" } } },
    });
  });

  it("pages with skip and take and reports the page count", async () => {
    mocks.count.mockResolvedValue(20);
    const result = await listPublishedArticles({ ...query, page: 3, pageSize: 9 });

    expect(mocks.findMany.mock.calls[0]?.[0]).toMatchObject({ skip: 18, take: 9 });
    expect(result).toMatchObject({
      status: "ok",
      data: { total: 20, page: 3, pageSize: 9, pageCount: 3 },
    });
  });

  it("clamps the page to at least 1 and the page size to 1..50", async () => {
    await listPublishedArticles({ locale: "en", page: 0, pageSize: 500 });
    expect(mocks.findMany.mock.calls[0]?.[0]).toMatchObject({ skip: 0, take: 50 });

    await listPublishedArticles({ locale: "en", page: Number.NaN, pageSize: -3 });
    expect(mocks.findMany.mock.calls[1]?.[0]).toMatchObject({ skip: 0, take: 1 });
  });

  it("maps rows to public summaries with localised names", async () => {
    mocks.count.mockResolvedValue(1);
    mocks.findMany.mockResolvedValue([summaryRow("alpha")]);

    const result = await listPublishedArticles({ ...query, tagSlug: "Logistics" });

    expect(result).toEqual({
      status: "ok",
      data: {
        items: [
          {
            slug: "alpha",
            title: "Title of alpha",
            summary: "Summary of alpha",
            publishedAt: "2026-09-01T08:00:00.000Z",
            authorName: "Editorial team",
            category: { slug: "updates", name: "动态" },
            tags: [{ slug: "logistics", name: "Logistics" }],
            cover: null,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 9,
        pageCount: 1,
        activeTag: { slug: "logistics", name: "Logistics" },
      },
    });
  });

  it("returns a result that survives JSON serialisation, as unstable_cache requires", async () => {
    mocks.count.mockResolvedValue(1);
    mocks.findMany.mockResolvedValue([summaryRow("alpha")]);

    const result = await listPublishedArticles(query);

    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("is empty, without touching the database, when none is configured", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);

    await expect(listPublishedArticles(query)).resolves.toEqual({
      status: "ok",
      data: { items: [], total: 0, page: 1, pageSize: 9, pageCount: 0, activeTag: null },
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("reports the database unavailable when it cannot be reached", async () => {
    mocks.count.mockRejectedValue(new DatabaseUnavailableError("down", { cause: "connection" }));

    await expect(listPublishedArticles(query)).resolves.toEqual({ status: "unavailable" });
    expect(mocks.warn).toHaveBeenCalledWith("news.list_unavailable", expect.anything());
  });

  it.each([
    ["a connection failure", { code: "ECONNREFUSED" }],
    ["a timeout", { code: "ETIMEDOUT" }],
    ["missing tables (migrations not applied)", { code: "P2021" }],
    ["missing columns (migrations not applied)", { code: "P2022" }],
  ])("reports the database unavailable on %s", async (_label, failure) => {
    mocks.findMany.mockRejectedValue(Object.assign(new Error("boom"), failure));

    await expect(listPublishedArticles(query)).resolves.toEqual({ status: "unavailable" });
  });

  it("does not hide a real bug", async () => {
    mocks.findMany.mockRejectedValue(new TypeError("a bug"));

    await expect(listPublishedArticles(query)).rejects.toThrow("a bug");
  });
});

describe("getPublishedArticle", () => {
  const query = { locale: "en", slug: "main-story" } as const;

  it("is null for an unknown, unpublished, scheduled or other-language slug", async () => {
    await expect(getPublishedArticle(query)).resolves.toEqual({ status: "ok", data: null });

    expect(mocks.findFirst).toHaveBeenCalledTimes(1);
    expect(mocks.findFirst.mock.calls[0]?.[0].where).toEqual({
      locale: "en",
      ...PUBLISHED_NOW,
      slug: "main-story",
    });
    // Nothing else is read for an article that is not there.
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.seoFindUnique).not.toHaveBeenCalled();
  });

  it("returns the article with its language versions, related articles and no draft data", async () => {
    mocks.findFirst.mockResolvedValue(detailRow());
    mocks.findMany.mockImplementation(async (args: { select: Record<string, unknown> }) =>
      "locale" in args.select && !("title" in args.select)
        ? [
            { locale: "zh", slug: "zhu-yao-xin-wen" },
            { locale: "en", slug: "main-story" },
          ]
        : [],
    );

    const result = await getPublishedArticle(query);

    expect(result).toMatchObject({
      status: "ok",
      data: {
        slug: "main-story",
        locale: "en",
        content: "Body of the story.",
        publishedAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-09-02T08:00:00.000Z",
        alternates: { en: "main-story", zh: "zhu-yao-xin-wen" },
        related: [],
        bodyImages: {},
        seo: null,
      },
    });
  });

  it("finds language versions among published, visible rows of the same group in any language", async () => {
    mocks.findFirst.mockResolvedValue(detailRow());

    await getPublishedArticle(query);

    const versions = mocks.findMany.mock.calls
      .map(([args]) => args)
      .find((args) => JSON.stringify(args.select) === JSON.stringify({ locale: true, slug: true }));
    expect(versions?.where).toEqual({ ...PUBLISHED_NOW, translationGroupId: "group-1" });
  });

  it("names the page being served for its own language whatever the group holds", async () => {
    mocks.findFirst.mockResolvedValue(detailRow());
    mocks.findMany.mockImplementation(async (args: { select: Record<string, unknown> }) =>
      "title" in args.select
        ? []
        : [
            { locale: "en", slug: "older-duplicate" },
            { locale: "en", slug: "main-story" },
          ],
    );

    const result = await getPublishedArticle(query);

    expect(result.status === "ok" && result.data?.alternates).toEqual({ en: "main-story" });
  });

  it("offers same-category articles first, then the newest others, never the article itself", async () => {
    mocks.findFirst.mockResolvedValue(detailRow());
    mocks.findMany.mockImplementation(
      async (args: { select: Record<string, unknown>; where: Record<string, unknown> }) => {
        if (!("title" in args.select)) return [];
        return "categoryId" in args.where
          ? [summaryRow("same-1")]
          : [summaryRow("other-1"), summaryRow("other-2")];
      },
    );

    const result = await getPublishedArticle(query);

    expect(result.status === "ok" && result.data?.related.map((item) => item.slug)).toEqual([
      "same-1",
      "other-1",
      "other-2",
    ]);
    const relatedCalls = mocks.findMany.mock.calls
      .map(([args]) => args)
      .filter((args) => "title" in args.select);
    expect(relatedCalls[0]).toMatchObject({
      where: { locale: "en", categoryId: "cat-1", id: { not: "id-main-story" } },
      take: 3,
    });
    expect(relatedCalls[1]).toMatchObject({
      where: { locale: "en", id: { notIn: ["id-main-story", "id-same-1"] } },
      take: 2,
    });
  });

  it("does not look for more related articles once the category has enough", async () => {
    mocks.findFirst.mockResolvedValue(detailRow());
    mocks.findMany.mockImplementation(async (args: { select: Record<string, unknown> }) =>
      "title" in args.select ? ["a", "b", "c"].map((slug) => summaryRow(slug)) : [],
    );

    await getPublishedArticle(query);

    const relatedCalls = mocks.findMany.mock.calls.filter(([args]) => "title" in args.select);
    expect(relatedCalls).toHaveLength(1);
  });

  it("skips the category query for an uncategorised article", async () => {
    mocks.findFirst.mockResolvedValue(detailRow({ categoryId: null, category: null }));

    await getPublishedArticle(query);

    const relatedCalls = mocks.findMany.mock.calls
      .map(([args]) => args)
      .filter((args) => "title" in args.select);
    expect(relatedCalls).toHaveLength(1);
    expect(relatedCalls[0].where).not.toHaveProperty("categoryId");
  });

  it("looks up only the public images the body refers to", async () => {
    const a = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
    const b = "7C9E6679-7425-40DE-944B-E07FC1F90AE7";
    mocks.findFirst.mockResolvedValue(
      detailRow({ content: `![one](/media/${a})\n\n[file](/media/${b})\n\n![again](/media/${a})` }),
    );
    mocks.mediaFindMany.mockResolvedValue([
      {
        id: a.toUpperCase(),
        kind: "IMAGE",
        visibility: "PUBLIC",
        width: 800,
        height: 600,
        translations: [{ locale: "en", altText: "A ship" }],
      },
    ]);

    const result = await getPublishedArticle(query);

    expect(mocks.mediaFindMany.mock.calls[0]?.[0].where).toEqual({
      id: { in: [a, b.toLowerCase()] },
      kind: "IMAGE",
      visibility: "PUBLIC",
    });
    expect(result.status === "ok" && result.data?.bodyImages).toEqual({
      [a]: { src: `/media/${a}`, width: 800, height: 600, alt: "A ship" },
    });
  });

  it("does not query media for a body without images", async () => {
    mocks.findFirst.mockResolvedValue(detailRow());

    await getPublishedArticle(query);

    expect(mocks.mediaFindMany).not.toHaveBeenCalled();
  });

  it("applies the SEO override stored for this article and language", async () => {
    mocks.findFirst.mockResolvedValue(detailRow());
    mocks.seoFindUnique.mockResolvedValue({
      title: "Custom title",
      description: null,
      noIndex: true,
      ogMedia: null,
    });

    const result = await getPublishedArticle(query);

    expect(mocks.seoFindUnique.mock.calls[0]?.[0].where).toEqual({
      scope_refKey_locale: { scope: "NEWS", refKey: "id-main-story", locale: "en" },
    });
    expect(result.status === "ok" && result.data?.seo).toEqual({
      title: "Custom title",
      description: null,
      noIndex: true,
      image: null,
    });
  });

  it("is unavailable when the database cannot be reached, and empty when none is configured", async () => {
    mocks.findFirst.mockRejectedValue(new DatabaseUnavailableError("down", { cause: "timeout" }));
    await expect(getPublishedArticle(query)).resolves.toEqual({ status: "unavailable" });

    mocks.isDatabaseConfigured.mockReturnValue(false);
    await expect(getPublishedArticle(query)).resolves.toEqual({ status: "ok", data: null });
  });
});

describe("listCategories", () => {
  it("counts published articles in the reader's language and leaves out empty categories", async () => {
    mocks.categoryFindMany.mockResolvedValue([
      { ...names("updates", "Updates", "动态"), _count: { articles: 4 } },
      { ...names("empty", "Empty"), _count: { articles: 0 } },
      { ...names("logistics", "Logistics"), _count: { articles: 1 } },
    ]);

    const result = await listCategories({ locale: "zh" });

    expect(result).toEqual({
      status: "ok",
      data: [
        { slug: "updates", name: "动态", count: 4 },
        { slug: "logistics", name: "Logistics", count: 1 },
      ],
    });
    const args = mocks.categoryFindMany.mock.calls[0]?.[0];
    expect(args.select._count.select.articles.where).toEqual({ locale: "zh", ...PUBLISHED_NOW });
    expect(args.orderBy).toEqual([{ sortOrder: "asc" }, { slug: "asc" }]);
  });

  it("is empty when no database is configured and unavailable when it fails", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    await expect(listCategories({ locale: "en" })).resolves.toEqual({ status: "ok", data: [] });

    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.categoryFindMany.mockRejectedValue(Object.assign(new Error("x"), { code: "P1001" }));
    await expect(listCategories({ locale: "en" })).resolves.toEqual({ status: "unavailable" });
  });
});
