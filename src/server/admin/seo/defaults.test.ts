// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    product: { findUnique: vi.fn() },
    newsArticle: { findUnique: vi.fn() },
  };
  return { db, getDb: vi.fn(() => db), getTranslations: vi.fn() };
});

vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
}));
vi.mock("next-intl/server", () => ({ getTranslations: mocks.getTranslations }));

import {
  getDefaultCategoryMetaPreview,
  getDefaultNewsMetaPreview,
  getDefaultPageMetaPreview,
  getDefaultProductMetaPreview,
} from "./defaults";

function fakeT(raw: Record<string, string>, formatted: Record<string, string> = {}) {
  const t = ((key: string) => formatted[key] ?? raw[key] ?? key) as unknown as Awaited<
    ReturnType<typeof mocks.getTranslations>
  >;
  (t as unknown as { raw: (key: string) => string }).raw = (key: string) => raw[key];
  return t;
}

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.product.findUnique.mockReset();
  mocks.db.newsArticle.findUnique.mockReset();
  mocks.getTranslations.mockReset();
});

describe("getDefaultPageMetaPreview", () => {
  it("reads the raw message for a known page key", async () => {
    mocks.getTranslations.mockResolvedValue(
      fakeT({ "meta.title": "About us", "meta.description": "Who we are." }),
    );
    expect(await getDefaultPageMetaPreview("about", "en")).toEqual({
      title: "About us",
      description: "Who we are.",
    });
  });

  it("is empty for a page key with no mapping", async () => {
    expect(await getDefaultPageMetaPreview("not-a-page", "en")).toEqual({
      title: null,
      description: null,
    });
    expect(mocks.getTranslations).not.toHaveBeenCalled();
  });
});

describe("getDefaultCategoryMetaPreview", () => {
  it("interpolates the category name into the raw title/description", async () => {
    mocks.getTranslations
      .mockResolvedValueOnce(
        fakeT(
          {},
          { "consumer-goods.name": "Consumer goods", "consumer-goods.summary": "Everyday items." },
        ),
      )
      .mockResolvedValueOnce(
        fakeT({
          "category.meta.title": "{name} | Shaheen Sky",
          "category.meta.description": "Browse {summary}",
        }),
      );
    expect(await getDefaultCategoryMetaPreview("consumer-goods", "en")).toEqual({
      title: "Consumer goods | Shaheen Sky",
      description: "Browse Everyday items.",
    });
  });
});

describe("getDefaultProductMetaPreview", () => {
  it("falls back to English when the requested locale has no translation", async () => {
    mocks.db.product.findUnique.mockResolvedValue({
      translations: [{ locale: "en", name: "Steel bolt", shortDescription: "M8 bolt" }],
    });
    expect(await getDefaultProductMetaPreview("p1", "zh")).toEqual({
      title: "Steel bolt",
      description: "M8 bolt",
    });
  });

  it("is empty when the product no longer exists", async () => {
    mocks.db.product.findUnique.mockResolvedValue(null);
    expect(await getDefaultProductMetaPreview("gone", "en")).toEqual({
      title: null,
      description: null,
    });
  });
});

describe("getDefaultNewsMetaPreview", () => {
  it("uses the article's own title and summary", async () => {
    mocks.db.newsArticle.findUnique.mockResolvedValue({
      title: "Expo 2026",
      summary: "We attended.",
    });
    expect(await getDefaultNewsMetaPreview("a1")).toEqual({
      title: "Expo 2026",
      description: "We attended.",
    });
  });
});
