// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@/server/db/errors";
import { parseProductListFilters } from "./filters";

const mocks = vi.hoisted(() => {
  const db = { product: { count: vi.fn(), findMany: vi.fn() } };
  return { db, getDb: vi.fn(() => db) };
});

vi.mock("@/server/db", () => ({ getDb: mocks.getDb }));

import { listProducts } from "./list";

const PAGE = { page: 1, pageSize: 20, skip: 0, take: 20 };

beforeEach(() => {
  mocks.getDb.mockReset().mockReturnValue(mocks.db);
  mocks.db.product.count.mockReset().mockResolvedValue(0);
  mocks.db.product.findMany.mockReset().mockResolvedValue([]);
});

describe("where clause", () => {
  it("filters by status and category", async () => {
    const filters = parseProductListFilters({ status: "DRAFT", category: "hardware-products" });
    await listProducts(filters, PAGE);
    expect(mocks.db.product.findMany.mock.calls[0][0].where).toEqual({
      status: "DRAFT",
      categorySlug: "hardware-products",
    });
  });

  it("searches the slug and any locale's name with OR", async () => {
    const filters = parseProductListFilters({ q: "mesh" });
    await listProducts(filters, PAGE);
    expect(mocks.db.product.findMany.mock.calls[0][0].where.OR).toEqual([
      { slug: { contains: "mesh" } },
      { translations: { some: { name: { contains: "mesh" } } } },
    ]);
  });
});

describe("sorting", () => {
  it("defaults to recently updated", async () => {
    await listProducts(parseProductListFilters({}), PAGE);
    expect(mocks.db.product.findMany.mock.calls[0][0].orderBy).toEqual([{ updatedAt: "desc" }]);
  });

  it("sorts by the editor's sortOrder, slug as a tiebreak", async () => {
    await listProducts(parseProductListFilters({ sort: "sortOrder" }), PAGE);
    expect(mocks.db.product.findMany.mock.calls[0][0].orderBy).toEqual([
      { sortOrder: "asc" },
      { slug: "asc" },
    ]);
  });
});

describe("row shape", () => {
  it("prefers the English name, falling back to the first locale that has one", async () => {
    mocks.db.product.findMany.mockResolvedValue([
      {
        id: "p1",
        slug: "steel-wire-mesh",
        categorySlug: "hardware-products",
        status: "DRAFT",
        featured: false,
        sortOrder: 0,
        updatedAt: new Date("2026-06-01T00:00:00Z"),
        translations: [{ locale: "zh", name: "钢丝网" }],
        images: [],
      },
      {
        id: "p2",
        slug: "widget",
        categorySlug: "hardware-products",
        status: "DRAFT",
        featured: false,
        sortOrder: 0,
        updatedAt: new Date("2026-06-01T00:00:00Z"),
        translations: [
          { locale: "zh", name: "小部件" },
          { locale: "en", name: "Widget" },
        ],
        images: [],
      },
    ]);

    const { rows } = await listProducts(parseProductListFilters({}), PAGE);

    expect(rows[0].displayName).toBe("钢丝网");
    expect(rows[0].translatedLocales).toEqual(["zh"]);
    expect(rows[1].displayName).toBe("Widget");
    expect(rows[1].translatedLocales).toEqual(["en", "zh"]);
  });

  it("falls back to the slug when there is no translation at all", async () => {
    mocks.db.product.findMany.mockResolvedValue([
      {
        id: "p1",
        slug: "no-name-yet",
        categorySlug: "hardware-products",
        status: "DRAFT",
        featured: false,
        sortOrder: 0,
        updatedAt: new Date("2026-06-01T00:00:00Z"),
        translations: [],
        images: [],
      },
    ]);

    const { rows } = await listProducts(parseProductListFilters({}), PAGE);
    expect(rows[0].displayName).toBe("no-name-yet");
  });

  it("takes the primary image", async () => {
    mocks.db.product.findMany.mockResolvedValue([
      {
        id: "p1",
        slug: "x",
        categorySlug: "hardware-products",
        status: "DRAFT",
        featured: false,
        sortOrder: 0,
        updatedAt: new Date("2026-06-01T00:00:00Z"),
        translations: [],
        images: [{ mediaAsset: { id: "m1", fileName: "a.jpg" } }],
      },
    ]);

    const { rows } = await listProducts(parseProductListFilters({}), PAGE);
    expect(rows[0].primaryImage).toEqual({ id: "m1", fileName: "a.jpg" });
  });
});

describe("database outage", () => {
  it("normalises a connection failure instead of letting a raw driver error through", async () => {
    mocks.db.product.count.mockRejectedValue(
      Object.assign(new Error("connect ETIMEDOUT"), { code: "P1002" }),
    );
    await expect(listProducts(parseProductListFilters({}), PAGE)).rejects.toBeInstanceOf(
      DatabaseUnavailableError,
    );
  });
});
