// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    seoMetadata: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
    newsArticle: { findMany: vi.fn() },
  };
  return { db, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
}));

import { getOverrideRows, listStaticSeoDirectory, searchNewsTargets, searchProductTargets } from "./queries";

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.seoMetadata.findMany.mockReset();
  mocks.db.product.findMany.mockReset();
  mocks.db.newsArticle.findMany.mockReset();
});

describe("listStaticSeoDirectory", () => {
  it("marks a target overridden only in the locales that have a row", async () => {
    mocks.db.seoMetadata.findMany.mockResolvedValue([
      { scope: "PAGE", refKey: "about", locale: "en" },
      { scope: "PAGE", refKey: "about", locale: "zh" },
      { scope: "CATEGORY", refKey: "consumer-goods", locale: "ar" },
    ]);

    const entries = await listStaticSeoDirectory();
    const about = entries.find((e) => e.scope === "PAGE" && e.refKey === "about");
    const home = entries.find((e) => e.scope === "PAGE" && e.refKey === "home");
    const category = entries.find((e) => e.scope === "CATEGORY" && e.refKey === "consumer-goods");

    expect(about?.overriddenLocales).toEqual(["en", "zh"]);
    expect(home?.overriddenLocales).toEqual([]);
    expect(category?.overriddenLocales).toEqual(["ar"]);
  });

  it("lists every static page and every registered category, honestly, with no overrides at all", async () => {
    mocks.db.seoMetadata.findMany.mockResolvedValue([]);
    const entries = await listStaticSeoDirectory();
    expect(entries.every((entry) => entry.overriddenLocales.length === 0)).toBe(true);
    expect(entries.some((entry) => entry.refKey === "home")).toBe(true);
    expect(entries.filter((entry) => entry.scope === "CATEGORY")).toHaveLength(12);
  });
});

describe("getOverrideRows", () => {
  it("maps the saved rows for one target", async () => {
    mocks.db.seoMetadata.findMany.mockResolvedValue([
      {
        id: "seo-1",
        locale: "en",
        title: "Custom",
        description: null,
        noIndex: false,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        ogMedia: null,
      },
    ]);

    const rows = await getOverrideRows("PAGE", "about");
    expect(rows).toEqual([
      {
        id: "seo-1",
        locale: "en",
        title: "Custom",
        description: null,
        noIndex: false,
        ogMedia: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("searchProductTargets", () => {
  it("keys the target by slug (the id the public page reads its override by), not the row id", async () => {
    mocks.db.product.findMany.mockResolvedValue([
      { slug: "steel-bolt", translations: [{ locale: "zh", name: "螺栓" }] },
    ]);
    const results = await searchProductTargets("bolt");
    expect(results).toEqual([
      { refKey: "steel-bolt", label: "螺栓", sublabel: "steel-bolt", locales: ["zh"] },
    ]);
  });
});

describe("searchNewsTargets", () => {
  it("labels each language version by its own title and locale", async () => {
    mocks.db.newsArticle.findMany.mockResolvedValue([
      { id: "a1", slug: "expo-2026", title: "Expo 2026", locale: "en" },
    ]);
    const results = await searchNewsTargets("expo");
    expect(results).toEqual([
      { refKey: "a1", label: "Expo 2026", sublabel: "expo-2026 · EN", locales: ["en"] },
    ]);
  });
});
