// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: { product: { findMany: vi.fn() } } }));
vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: () => mocks.db,
}));

import { computeProductTranslationCoverage } from "./products";

beforeEach(() => {
  mocks.db.product.findMany.mockReset();
});

describe("computeProductTranslationCoverage", () => {
  it("lists the locales present and the ones missing for each product", async () => {
    mocks.db.product.findMany.mockResolvedValue([
      {
        id: "p1",
        slug: "steel-bolt",
        categorySlug: "hardware-products",
        translations: [{ locale: "en" }],
      },
      {
        id: "p2",
        slug: "cotton-shirt",
        categorySlug: "apparel-accessories",
        translations: [{ locale: "en" }, { locale: "zh" }, { locale: "ar" }],
      },
    ]);

    const result = await computeProductTranslationCoverage();
    expect(result[0]).toMatchObject({ id: "p1", locales: ["en"], missingLocales: ["zh", "ar"] });
    expect(result[1]).toMatchObject({ id: "p2", locales: ["en", "zh", "ar"], missingLocales: [] });
  });

  it("is an honest empty list with no products", async () => {
    mocks.db.product.findMany.mockResolvedValue([]);
    expect(await computeProductTranslationCoverage()).toEqual([]);
  });
});
