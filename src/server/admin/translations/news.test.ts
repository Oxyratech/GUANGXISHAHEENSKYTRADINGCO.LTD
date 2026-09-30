// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: { newsArticle: { findMany: vi.fn() } } }));
vi.mock("@/server/db", async () => ({ ...(await import("@/server/db/errors")), getDb: () => mocks.db }));

import { computeNewsTranslationCoverage } from "./news";

beforeEach(() => {
  mocks.db.newsArticle.findMany.mockReset();
});

describe("computeNewsTranslationCoverage", () => {
  it("groups language versions of the same story and lists the missing locales", async () => {
    mocks.db.newsArticle.findMany.mockResolvedValue([
      { id: "a-en", translationGroupId: "group-1", locale: "en", title: "Expo 2026", status: "PUBLISHED" },
      { id: "a-zh", translationGroupId: "group-1", locale: "zh", title: "展会", status: "DRAFT" },
      { id: "b-en", translationGroupId: "group-2", locale: "en", title: "Solo story", status: "DRAFT" },
    ]);

    const result = await computeNewsTranslationCoverage();
    const group1 = result.find((g) => g.translationGroupId === "group-1");
    const group2 = result.find((g) => g.translationGroupId === "group-2");

    expect(group1).toMatchObject({ title: "Expo 2026", locales: ["en", "zh"], missingLocales: ["ar"] });
    expect(group1?.articles).toHaveLength(2);
    expect(group2).toMatchObject({ title: "Solo story", locales: ["en"], missingLocales: ["zh", "ar"] });
  });

  it("is an honest empty list with no articles", async () => {
    mocks.db.newsArticle.findMany.mockResolvedValue([]);
    expect(await computeNewsTranslationCoverage()).toEqual([]);
  });
});
