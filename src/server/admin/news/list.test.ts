// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { newsArticle: { count: vi.fn(), findMany: vi.fn() } },
}));
vi.mock("@/server/db", async () => ({ ...(await import("@/server/db/errors")), getDb: () => mocks.db }));

import { listNewsArticles } from "./list";
import type { NewsListFilters } from "./filters";

const FILTERS: NewsListFilters = { q: "", locale: "", status: "", category: "", sort: "newest" };
const PAGE = { page: 1, pageSize: 20, skip: 0, take: 20 };

beforeEach(() => {
  mocks.db.newsArticle.count.mockReset().mockResolvedValue(0);
  mocks.db.newsArticle.findMany.mockReset().mockResolvedValue([]);
});

describe("listNewsArticles", () => {
  it("lists the other locales of the same story, excluding the row's own", async () => {
    mocks.db.newsArticle.count.mockResolvedValue(2);
    mocks.db.newsArticle.findMany
      .mockResolvedValueOnce([
        {
          id: "a-en",
          locale: "en",
          slug: "expo",
          title: "Expo",
          status: "PUBLISHED",
          publishedAt: new Date("2026-01-01T00:00:00Z"),
          authorName: "Staff",
          translationGroupId: "group-1",
          category: null,
        },
        {
          id: "a-zh",
          locale: "zh",
          slug: "expo-zh",
          title: "展会",
          status: "DRAFT",
          publishedAt: null,
          authorName: null,
          translationGroupId: "group-1",
          category: null,
        },
      ])
      .mockResolvedValueOnce([
        { translationGroupId: "group-1", locale: "en" },
        { translationGroupId: "group-1", locale: "zh" },
      ]);

    const result = await listNewsArticles(FILTERS, PAGE);
    expect(result.rows[0]).toMatchObject({ id: "a-en", siblingLocales: ["zh"] });
    expect(result.rows[1]).toMatchObject({ id: "a-zh", siblingLocales: ["en"] });
  });

  it("returns an honest empty result with no rows", async () => {
    const result = await listNewsArticles(FILTERS, PAGE);
    expect(result.rows).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});
