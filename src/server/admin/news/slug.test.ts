// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { newsArticle: { findFirst: vi.fn() } },
}));
vi.mock("@/server/db", () => ({ getDb: () => mocks.db }));

import { isNewsSlugTaken, isValidNewsSlug, suggestSlugFromTitle } from "./slug";

beforeEach(() => {
  mocks.db.newsArticle.findFirst.mockReset();
});

describe("suggestSlugFromTitle", () => {
  it("lower-cases and hyphenates a plain title", () => {
    expect(suggestSlugFromTitle("Shaheen Sky Attends Canton Fair 2026")).toBe(
      "shaheen-sky-attends-canton-fair-2026",
    );
  });

  it("strips accents and punctuation", () => {
    expect(suggestSlugFromTitle("Café: A Reflection, Naïve?")).toBe("cafe-a-reflection-naive");
  });

  it("falls back to a generic slug for non-Latin titles", () => {
    expect(suggestSlugFromTitle("展会新闻")).toBe("article");
  });
});

describe("isValidNewsSlug", () => {
  it("accepts lower-case, hyphen-separated slugs", () => {
    expect(isValidNewsSlug("expo-2026")).toBe(true);
  });

  it("rejects spaces, uppercase and leading/trailing hyphens", () => {
    expect(isValidNewsSlug("Expo 2026")).toBe(false);
    expect(isValidNewsSlug("-expo-")).toBe(false);
    expect(isValidNewsSlug("")).toBe(false);
  });
});

describe("isNewsSlugTaken", () => {
  it("is scoped to the locale and excludes the given id", async () => {
    mocks.db.newsArticle.findFirst.mockResolvedValue(null);
    await isNewsSlugTaken("en", "expo-2026", "self-id");
    expect(mocks.db.newsArticle.findFirst).toHaveBeenCalledWith({
      where: { locale: "en", slug: "expo-2026", NOT: { id: "self-id" } },
      select: { id: true },
    });
  });

  it("is true when another row matches", async () => {
    mocks.db.newsArticle.findFirst.mockResolvedValue({ id: "other" });
    expect(await isNewsSlugTaken("en", "expo-2026")).toBe(true);
  });
});
