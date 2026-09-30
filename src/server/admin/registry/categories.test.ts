// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATEGORIES } from "@/content/categories";

const mocks = vi.hoisted(() => ({ countPublishedByCategory: vi.fn() }));

vi.mock("@/server/products", () => ({
  countPublishedByCategory: mocks.countPublishedByCategory,
}));

import { listCategoryRegistry } from "./categories";

beforeEach(() => {
  mocks.countPublishedByCategory.mockReset();
});

describe("listCategoryRegistry", () => {
  it("lists exactly the 12 code-defined categories, in their defined order", async () => {
    mocks.countPublishedByCategory.mockResolvedValue({ ok: true, data: {} });

    const { rows } = await listCategoryRegistry();

    expect(rows).toHaveLength(CATEGORIES.length);
    expect(rows.map((row) => row.slug)).toEqual(CATEGORIES.map((c) => c.slug));
  });

  it("carries the regulated flag and the English name from the categories namespace", async () => {
    mocks.countPublishedByCategory.mockResolvedValue({ ok: true, data: {} });

    const { rows } = await listCategoryRegistry();
    const food = rows.find((row) => row.slug === "food-products");

    expect(food?.regulated).toBe(true);
    expect(food?.name).toBe("Food Products");
  });

  it("counts the registered scope items behind each category and keeps their verbatim license text", async () => {
    mocks.countPublishedByCategory.mockResolvedValue({ ok: true, data: {} });

    const { rows } = await listCategoryRegistry();
    const minerals = rows.find((row) => row.slug === "minerals-ores");

    expect(minerals?.scopeItemCount).toBeGreaterThan(0);
    expect(minerals?.scopeItemsZh).toContain("煤炭及制品销售");
  });

  it("reports the published count from the database when it is available", async () => {
    mocks.countPublishedByCategory.mockResolvedValue({
      ok: true,
      data: { "hardware-products": 4 },
    });

    const { rows, databaseUnavailable } = await listCategoryRegistry();

    expect(databaseUnavailable).toBeNull();
    expect(rows.find((row) => row.slug === "hardware-products")?.publishedCount).toBe(4);
    expect(rows.find((row) => row.slug === "metal-products")?.publishedCount).toBe(0);
  });

  it("reports null counts (never a fabricated zero) when the database is unavailable", async () => {
    mocks.countPublishedByCategory.mockResolvedValue({ ok: false, cause: "not_configured" });

    const { rows, databaseUnavailable } = await listCategoryRegistry();

    expect(databaseUnavailable).toBe("not_configured");
    expect(rows.every((row) => row.publishedCount === null)).toBe(true);
  });

  it("builds a public page path for every locale", async () => {
    mocks.countPublishedByCategory.mockResolvedValue({ ok: true, data: {} });
    const { rows } = await listCategoryRegistry();
    const row = rows[0];
    expect(row.publicPaths).toEqual({
      en: `/en/products/${row.slug}`,
      zh: `/zh/products/${row.slug}`,
      ar: `/ar/products/${row.slug}`,
    });
  });
});
