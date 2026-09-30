// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  groupBy: vi.fn(),
  getDb: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  // unstable_cache needs the Next.js runtime; here it hands back the function it was given.
  unstableCache: vi.fn(<T>(fn: T) => fn),
  warn: vi.fn(),
}));

vi.mock("next/cache", () => ({ unstable_cache: mocks.unstableCache }));
vi.mock("@/lib/logger", () => ({ logger: { warn: mocks.warn, error: vi.fn(), info: vi.fn() } }));
vi.mock("@/server/db", async () => ({
  ...(await import("@/server/db/errors")),
  getDb: mocks.getDb,
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

import { PRODUCTS_CACHE_TAG, PRODUCTS_REVALIDATE_SECONDS } from "./constants";
import { countPublishedByCategory, getPublishedProduct, listPublishedProducts } from "./repository";

// Recorded at import time, before any test resets the mock.
const cacheOptions = mocks.unstableCache.mock.calls.map(
  (call) => (call as unknown as [unknown, unknown, { revalidate: number; tags: string[] }])[2],
);

const NOW = new Date("2026-08-01T12:00:00.000Z");
const IMAGE = "0a1b2c3d-0000-4000-8000-00000000000a";

const row = (slug: string, categorySlug = "hardware-products") => ({
  slug,
  categorySlug,
  translations: [{ locale: "en", name: slug.toUpperCase(), shortDescription: null }],
  images: [{ mediaAssetId: IMAGE, mediaAsset: { width: 10, height: 10, translations: [] } }],
});

function detailRow() {
  return {
    slug: "steel-bolt",
    categorySlug: "hardware-products",
    origin: null,
    publishedAt: null,
    updatedAt: NOW,
    translations: [
      {
        locale: "en",
        name: "Steel bolt",
        shortDescription: null,
        description: null,
        applications: null,
        packagingInfo: null,
      },
    ],
    images: [],
    specifications: [],
    documents: [],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mocks.count.mockReset().mockResolvedValue(0);
  mocks.findMany.mockReset().mockResolvedValue([]);
  mocks.findFirst.mockReset().mockResolvedValue(null);
  mocks.groupBy.mockReset().mockResolvedValue([]);
  mocks.warn.mockReset();
  mocks.getDb.mockReset().mockReturnValue({
    product: {
      count: mocks.count,
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      groupBy: mocks.groupBy,
    },
  });
  mocks.isDatabaseConfigured.mockReset().mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("caching", () => {
  it("caches every read for five minutes under the products tag", () => {
    expect(cacheOptions.length).toBeGreaterThanOrEqual(3);
    for (const options of cacheOptions) {
      expect(options).toEqual({
        revalidate: PRODUCTS_REVALIDATE_SECONDS,
        tags: [PRODUCTS_CACHE_TAG],
      });
    }
    expect(PRODUCTS_REVALIDATE_SECONDS).toBe(300);
    expect(PRODUCTS_CACHE_TAG).toBe("products");
  });
});

describe("listPublishedProducts", () => {
  it("returns only PUBLISHED products whose publication date is not in the future", async () => {
    mocks.count.mockResolvedValue(1);
    mocks.findMany.mockResolvedValue([row("a")]);

    await listPublishedProducts({ locale: "en", page: 1, pageSize: 12 });

    const { where } = mocks.findMany.mock.calls[0]![0];
    expect(where).toMatchObject({
      status: "PUBLISHED",
      OR: [{ publishedAt: null }, { publishedAt: { lte: NOW } }],
    });
    expect(mocks.count.mock.calls[0]![0].where).toEqual(where);
  });

  it("limits the query to products with a translation the locale can show (its own or English)", async () => {
    await listPublishedProducts({ locale: "ar", page: 1, pageSize: 12 });
    expect(mocks.count.mock.calls[0]![0].where.translations).toEqual({
      some: { locale: { in: ["ar", "en"] } },
    });

    mocks.count.mockClear();
    await listPublishedProducts({ locale: "en", page: 1, pageSize: 12 });
    expect(mocks.count.mock.calls[0]![0].where.translations).toEqual({
      some: { locale: { in: ["en"] } },
    });
  });

  it("filters by category, or by all registered categories when none is given", async () => {
    await listPublishedProducts({
      locale: "en",
      categorySlug: "metal-products",
      page: 1,
      pageSize: 12,
    });
    expect(mocks.count.mock.calls[0]![0].where.categorySlug).toBe("metal-products");

    mocks.count.mockClear();
    await listPublishedProducts({ locale: "en", page: 1, pageSize: 12 });
    expect(mocks.count.mock.calls[0]![0].where.categorySlug.in).toHaveLength(12);
  });

  it("returns an empty page without touching the database for an unknown category", async () => {
    const result = await listPublishedProducts({
      locale: "en",
      categorySlug: "made-up",
      page: 1,
      pageSize: 12,
    });
    expect(result).toEqual({
      ok: true,
      data: { items: [], total: 0, page: 1, pageSize: 12, pageCount: 0 },
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("does not read rows when nothing is published", async () => {
    const result = await listPublishedProducts({ locale: "en", page: 1, pageSize: 12 });
    expect(result).toMatchObject({ ok: true, data: { total: 0, items: [], pageCount: 0 } });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("pages the results and clamps a page beyond the last one", async () => {
    mocks.count.mockResolvedValue(25);
    mocks.findMany.mockResolvedValue([row("z")]);

    const result = await listPublishedProducts({ locale: "en", page: 99, pageSize: 12 });

    expect(mocks.findMany.mock.calls[0]![0]).toMatchObject({ skip: 24, take: 12 });
    expect(result).toMatchObject({ ok: true, data: { page: 3, pageCount: 3, total: 25 } });
  });

  it("sanitises page and page size", async () => {
    mocks.count.mockResolvedValue(500);
    await listPublishedProducts({ locale: "en", page: -4, pageSize: 10_000 });
    expect(mocks.findMany.mock.calls[0]![0]).toMatchObject({ skip: 0, take: 48 });

    mocks.findMany.mockClear();
    await listPublishedProducts({ locale: "en", page: Number.NaN, pageSize: 0 });
    expect(mocks.findMany.mock.calls[0]![0]).toMatchObject({ skip: 0, take: 1 });
  });

  it("orders featured, then the editor's order, then newest, with the slug as tiebreaker", async () => {
    mocks.count.mockResolvedValue(1);
    await listPublishedProducts({ locale: "en", page: 1, pageSize: 12 });
    expect(mocks.findMany.mock.calls[0]![0].orderBy).toEqual([
      { featured: "desc" },
      { sortOrder: "asc" },
      { publishedAt: "desc" },
      { slug: "asc" },
    ]);
  });

  it("selects the primary image first, and only public images", async () => {
    mocks.count.mockResolvedValue(1);
    await listPublishedProducts({ locale: "en", page: 1, pageSize: 12 });
    const { images } = mocks.findMany.mock.calls[0]![0].select;
    expect(images.orderBy).toEqual([{ isPrimary: "desc" }, { sortOrder: "asc" }]);
    expect(images.where).toEqual({ mediaAsset: { kind: "IMAGE", visibility: "PUBLIC" } });
    expect(images.take).toBe(1);
  });

  it("selects only public columns, never internal ones", async () => {
    mocks.count.mockResolvedValue(1);
    await listPublishedProducts({ locale: "en", page: 1, pageSize: 12 });
    const { select } = mocks.findMany.mock.calls[0]![0];
    expect(Object.keys(select).sort()).toEqual(["categorySlug", "images", "slug", "translations"]);
    expect(select.translations.select).toEqual({
      locale: true,
      name: true,
      shortDescription: true,
    });
  });

  it("maps rows to summaries in the requested locale, with English as fallback", async () => {
    mocks.count.mockResolvedValue(2);
    mocks.findMany.mockResolvedValue([
      row("a"),
      {
        ...row("b"),
        translations: [{ locale: "ar", name: "ب", shortDescription: "وصف" }],
      },
    ]);

    const result = await listPublishedProducts({ locale: "ar", page: 1, pageSize: 12 });

    expect(result.ok && result.data.items).toEqual([
      expect.objectContaining({ slug: "a", name: "A", contentLocale: "en" }),
      expect.objectContaining({ slug: "b", name: "ب", contentLocale: "ar" }),
    ]);
  });

  it("links images through the public media route", async () => {
    mocks.count.mockResolvedValue(1);
    mocks.findMany.mockResolvedValue([row("a")]);
    const result = await listPublishedProducts({ locale: "en", page: 1, pageSize: 12 });
    expect(result.ok && result.data.items[0]?.image?.src).toBe(`/media/${IMAGE}`);
  });
});

describe("getPublishedProduct", () => {
  it("looks the product up by slug and category among published products only", async () => {
    await getPublishedProduct({
      locale: "en",
      categorySlug: "hardware-products",
      slug: "steel-bolt",
    });
    const { where } = mocks.findFirst.mock.calls[0]![0];
    expect(where).toMatchObject({
      slug: "steel-bolt",
      categorySlug: "hardware-products",
      status: "PUBLISHED",
      OR: [{ publishedAt: null }, { publishedAt: { lte: NOW } }],
    });
  });

  it("is null for a product that is not published (draft, archived, scheduled or unknown)", async () => {
    const result = await getPublishedProduct({
      locale: "en",
      categorySlug: "hardware-products",
      slug: "draft-item",
    });
    expect(result).toEqual({ ok: true, data: null });
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("answers null for an unknown category or an impossible slug without touching the database", async () => {
    expect(await getPublishedProduct({ locale: "en", categorySlug: "nope", slug: "a" })).toEqual({
      ok: true,
      data: null,
    });
    expect(
      await getPublishedProduct({
        locale: "en",
        categorySlug: "metal-products",
        slug: "x".repeat(121),
      }),
    ).toEqual({ ok: true, data: null });
    expect(
      await getPublishedProduct({ locale: "en", categorySlug: "metal-products", slug: "" }),
    ).toEqual({
      ok: true,
      data: null,
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("selects public documents and images only, with ordered specifications", async () => {
    await getPublishedProduct({
      locale: "en",
      categorySlug: "hardware-products",
      slug: "steel-bolt",
    });
    const { select } = mocks.findFirst.mock.calls[0]![0];
    expect(select.documents.where).toEqual({ mediaAsset: { visibility: "PUBLIC" } });
    expect(select.images.where).toEqual({ mediaAsset: { kind: "IMAGE", visibility: "PUBLIC" } });
    expect(select.images.orderBy).toEqual([{ isPrimary: "desc" }, { sortOrder: "asc" }]);
    expect(select.specifications.orderBy).toEqual({ sortOrder: "asc" });
    for (const internal of ["status", "sortOrder", "featured", "createdById", "version", "id"]) {
      expect(select).not.toHaveProperty(internal);
    }
  });

  it("returns the detail with related products of the same category, excluding itself", async () => {
    mocks.findFirst.mockResolvedValue(detailRow());
    mocks.findMany.mockResolvedValue([row("washer")]);

    const result = await getPublishedProduct({
      locale: "en",
      categorySlug: "hardware-products",
      slug: "steel-bolt",
    });

    const related = mocks.findMany.mock.calls[0]![0];
    expect(related.where).toMatchObject({
      categorySlug: "hardware-products",
      status: "PUBLISHED",
      slug: { not: "steel-bolt" },
    });
    expect(related.take).toBe(3);
    expect(result.ok && result.data?.name).toBe("Steel bolt");
    expect(result.ok && result.data?.related.map((product) => product.slug)).toEqual(["washer"]);
  });
});

describe("countPublishedByCategory", () => {
  it("counts for English when no locale is given", async () => {
    await countPublishedByCategory();
    expect(mocks.groupBy.mock.calls[0]![0].where.translations).toEqual({
      some: { locale: { in: ["en"] } },
    });
  });

  it("counts published products per category and reports zero for the others", async () => {
    mocks.groupBy.mockResolvedValue([
      { categorySlug: "metal-products", _count: { _all: 4 } },
      { categorySlug: "not-a-category", _count: { _all: 9 } },
    ]);

    const result = await countPublishedByCategory("en");

    expect(mocks.groupBy.mock.calls[0]![0]).toMatchObject({
      by: ["categorySlug"],
      where: { status: "PUBLISHED" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data["metal-products"]).toBe(4);
    expect(result.data["consumer-goods"]).toBe(0);
    expect(Object.keys(result.data)).toHaveLength(12);
    expect(result.data).not.toHaveProperty("not-a-category");
  });
});

describe("when the database cannot be used", () => {
  it("reports not_configured without opening a connection", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);

    expect(await listPublishedProducts({ locale: "en", page: 1, pageSize: 12 })).toEqual({
      ok: false,
      cause: "not_configured",
    });
    expect(
      await getPublishedProduct({ locale: "en", categorySlug: "metal-products", slug: "a" }),
    ).toEqual({ ok: false, cause: "not_configured" });
    expect(await countPublishedByCategory("en")).toEqual({ ok: false, cause: "not_configured" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("reports a connection failure as unavailable instead of throwing", async () => {
    mocks.count.mockRejectedValue(
      Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
    );

    expect(await listPublishedProducts({ locale: "en", page: 1, pageSize: 12 })).toEqual({
      ok: false,
      cause: "connection",
    });
    expect(mocks.warn).toHaveBeenCalledWith(
      "products.list_unavailable",
      expect.objectContaining({ cause: "connection" }),
    );
  });

  it("reports a timeout with its own cause", async () => {
    mocks.findFirst.mockRejectedValue(Object.assign(new Error("timed out"), { code: "ETIMEDOUT" }));
    expect(
      await getPublishedProduct({ locale: "en", categorySlug: "metal-products", slug: "a" }),
    ).toEqual({ ok: false, cause: "timeout" });
  });

  it("reports missing tables (migrations not applied) as unavailable", async () => {
    mocks.groupBy.mockRejectedValue(Object.assign(new Error("no table"), { code: "P2021" }));
    expect(await countPublishedByCategory("en")).toEqual({ ok: false, cause: "connection" });
  });

  it("does not hide a bug: an unexpected error is thrown", async () => {
    mocks.count.mockRejectedValue(new TypeError("cannot read properties of undefined"));
    await expect(listPublishedProducts({ locale: "en", page: 1, pageSize: 12 })).rejects.toThrow(
      TypeError,
    );
  });
});
