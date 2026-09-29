import { getDynamicSitemapEntries } from "./sitemap-dynamic";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn<() => boolean>(),
  getDb: vi.fn(),
  productFindMany: vi.fn(),
  newsFindMany: vi.fn(),
}));

vi.mock("@/server/db", async () => ({
  // The real error helpers, without loading Prisma.
  ...(await import("@/server/db/errors")),
  isDatabaseConfigured: mocks.isDatabaseConfigured,
  getDb: mocks.getDb,
}));

const ORIGIN = "https://www.example.test";
const updatedAt = new Date("2026-08-01T10:00:00.000Z");

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", ORIGIN);
  mocks.isDatabaseConfigured.mockReturnValue(true);
  mocks.productFindMany.mockResolvedValue([]);
  mocks.newsFindMany.mockResolvedValue([]);
  mocks.getDb.mockReturnValue({
    product: { findMany: mocks.productFindMany },
    newsArticle: { findMany: mocks.newsFindMany },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("getDynamicSitemapEntries: without a usable database", () => {
  it("returns nothing, and never touches the database, when none is configured", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    await expect(getDynamicSitemapEntries()).resolves.toEqual([]);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("skips quietly when getDb reports the database unavailable", async () => {
    const { DatabaseUnavailableError } = await import("@/server/db/errors");
    mocks.getDb.mockImplementation(() => {
      throw new DatabaseUnavailableError("down", { cause: "connection" });
    });
    await expect(getDynamicSitemapEntries()).resolves.toEqual([]);
  });

  it.each([
    ["connection refused", { code: "ECONNREFUSED" }],
    ["timeout", { code: "ETIMEDOUT" }],
    ["prisma cannot reach the server", { code: "P1001" }],
    ["migrations not applied (missing table)", { code: "P2021" }],
    ["migrations not applied (missing column)", { code: "P2022" }],
  ])("skips quietly when a query fails with %s", async (_label, failure) => {
    mocks.productFindMany.mockRejectedValue(Object.assign(new Error("boom"), failure));
    await expect(getDynamicSitemapEntries()).resolves.toEqual([]);
  });

  it("does not hide a real bug", async () => {
    mocks.newsFindMany.mockRejectedValue(new TypeError("cannot read properties of undefined"));
    await expect(getDynamicSitemapEntries()).rejects.toThrow("cannot read properties");
  });
});

describe("getDynamicSitemapEntries: queries", () => {
  it("reads only published rows and only slug / locale / date columns", async () => {
    await getDynamicSitemapEntries();

    const productQuery = mocks.productFindMany.mock.calls[0]?.[0];
    expect(productQuery.where.status).toBe("PUBLISHED");
    expect(productQuery.select).toEqual({
      slug: true,
      categorySlug: true,
      updatedAt: true,
      translations: { select: { locale: true } },
    });

    const newsQuery = mocks.newsFindMany.mock.calls[0]?.[0];
    expect(newsQuery.where.status).toBe("PUBLISHED");
    expect(newsQuery.select).toEqual({
      slug: true,
      locale: true,
      updatedAt: true,
      translationGroupId: true,
    });
  });

  it("leaves out anything scheduled for the future", async () => {
    await getDynamicSitemapEntries();
    const { OR } = mocks.productFindMany.mock.calls[0]?.[0].where;
    expect(OR).toEqual([{ publishedAt: null }, { publishedAt: { lte: expect.any(Date) } }]);
  });
});

describe("getDynamicSitemapEntries: products", () => {
  it("lists a product in each locale it is translated into, dated by the record", async () => {
    mocks.productFindMany.mockResolvedValue([
      {
        slug: "steel-bolt",
        categorySlug: "hardware-products",
        updatedAt,
        translations: [{ locale: "en" }, { locale: "zh" }],
      },
    ]);

    const alternates = {
      languages: {
        en: `${ORIGIN}/en/products/hardware-products/steel-bolt`,
        "zh-CN": `${ORIGIN}/zh/products/hardware-products/steel-bolt`,
        "x-default": `${ORIGIN}/en/products/hardware-products/steel-bolt`,
      },
    };
    await expect(getDynamicSitemapEntries()).resolves.toEqual([
      {
        url: `${ORIGIN}/en/products/hardware-products/steel-bolt`,
        lastModified: updatedAt,
        alternates,
      },
      {
        url: `${ORIGIN}/zh/products/hardware-products/steel-bolt`,
        lastModified: updatedAt,
        alternates,
      },
    ]);
  });

  it("skips products with no translation, an unknown category, or an unknown locale", async () => {
    mocks.productFindMany.mockResolvedValue([
      { slug: "a", categorySlug: "hardware-products", updatedAt, translations: [] },
      { slug: "b", categorySlug: "not-a-category", updatedAt, translations: [{ locale: "en" }] },
      { slug: "c", categorySlug: "hardware-products", updatedAt, translations: [{ locale: "fr" }] },
    ]);
    await expect(getDynamicSitemapEntries()).resolves.toEqual([]);
  });
});

describe("getDynamicSitemapEntries: news", () => {
  it("links language versions with different slugs through their translation group", async () => {
    mocks.newsFindMany.mockResolvedValue([
      { slug: "opening", locale: "en", updatedAt, translationGroupId: "g1" },
      {
        slug: "kai-ye",
        locale: "zh",
        updatedAt: new Date("2026-08-02T00:00:00.000Z"),
        translationGroupId: "g1",
      },
      { slug: "solo", locale: "ar", updatedAt, translationGroupId: "g2" },
    ]);

    const entries = await getDynamicSitemapEntries();
    expect(entries).toHaveLength(3);

    const english = entries.find((e) => e.url === `${ORIGIN}/en/news/opening`);
    expect(english?.lastModified).toEqual(updatedAt);
    expect(english?.alternates?.languages).toEqual({
      en: `${ORIGIN}/en/news/opening`,
      "zh-CN": `${ORIGIN}/zh/news/kai-ye`,
      "x-default": `${ORIGIN}/en/news/opening`,
    });

    const chinese = entries.find((e) => e.url === `${ORIGIN}/zh/news/kai-ye`);
    expect(chinese?.lastModified).toEqual(new Date("2026-08-02T00:00:00.000Z"));
    expect(chinese?.alternates?.languages).toEqual(english?.alternates?.languages);

    const arabicOnly = entries.find((e) => e.url === `${ORIGIN}/ar/news/solo`);
    expect(arabicOnly?.alternates?.languages).toEqual({
      ar: `${ORIGIN}/ar/news/solo`,
      "x-default": `${ORIGIN}/ar/news/solo`,
    });
  });

  it("ignores articles in a locale the site does not serve", async () => {
    mocks.newsFindMany.mockResolvedValue([
      { slug: "x", locale: "fr", updatedAt, translationGroupId: "g" },
    ]);
    await expect(getDynamicSitemapEntries()).resolves.toEqual([]);
  });
});
