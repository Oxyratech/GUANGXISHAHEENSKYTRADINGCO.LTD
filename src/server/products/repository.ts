import "server-only";
import { unstable_cache } from "next/cache";
import { CATEGORY_SLUGS, isCategorySlug } from "@/content/categories";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { logger } from "@/lib/logger";
import {
  DatabaseUnavailableError,
  getDb,
  isDatabaseConfigured,
  toDatabaseError,
} from "@/server/db";
import {
  MAX_PRODUCTS_PAGE_SIZE,
  PRODUCTS_CACHE_TAG,
  PRODUCTS_REVALIDATE_SECONDS,
  RELATED_PRODUCTS_COUNT,
} from "./constants";
import { toProductDetail, toProductSummaries } from "./mappers";
import { DETAIL_SELECT, listSelect, PRODUCT_ORDER, visibleProducts } from "./queries";
import type { CategoryProductCounts, ProductDetail, ProductPage, ProductsResult } from "./types";

/*
 * Read-only product repository for the public site.
 *
 * Error contract: a database that cannot be used (no DATABASE_URL, unreachable, timing out,
 * migrations not applied) is returned as `{ ok: false, cause }`, never thrown, so a page can show
 * an honest state without a try/catch. Programming errors still throw. Nothing here writes.
 *
 * Caching: results are cached for five minutes under the "products" tag (unstable_cache). A failed
 * read throws inside the cached function and is therefore never cached; it is converted to the
 * Result outside it.
 */

/** Prisma: the table (P2021) or column (P2022) does not exist yet, i.e. migrations have not run. */
const SCHEMA_NOT_READY_CODES = new Set(["P2021", "P2022"]);

const CACHE_OPTIONS = {
  revalidate: PRODUCTS_REVALIDATE_SECONDS,
  tags: [PRODUCTS_CACHE_TAG],
};

/** The longest slug the database can hold; anything longer cannot exist. */
const MAX_SLUG_LENGTH = 120;

function asUnavailable(error: unknown): DatabaseUnavailableError | null {
  const mapped = toDatabaseError(error);
  if (mapped instanceof DatabaseUnavailableError) return mapped;
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string" && SCHEMA_NOT_READY_CODES.has(code)) {
    return new DatabaseUnavailableError("Product tables are not available", {
      cause: "connection",
    });
  }
  return null;
}

async function guarded<T>(operation: string, read: () => Promise<T>): Promise<ProductsResult<T>> {
  if (!isDatabaseConfigured()) return { ok: false, cause: "not_configured" };
  try {
    return { ok: true, data: await read() };
  } catch (error) {
    const unavailable = asUnavailable(error);
    if (!unavailable) throw error;
    logger.warn(`products.${operation}_unavailable`, { cause: unavailable.cause, error });
    return { ok: false, cause: unavailable.cause };
  }
}

function emptyPage(pageSize: number): ProductPage {
  return { items: [], total: 0, page: 1, pageSize, pageCount: 0 };
}

const readPage = unstable_cache(
  async (
    locale: Locale,
    categorySlug: string | null,
    page: number,
    pageSize: number,
  ): Promise<ProductPage> => {
    const db = getDb();
    const where = visibleProducts({ now: new Date(), locale, categorySlug });

    const total = await db.product.count({ where });
    if (total === 0) return emptyPage(pageSize);

    const pageCount = Math.ceil(total / pageSize);
    const current = Math.min(page, pageCount);
    const rows = await db.product.findMany({
      where,
      orderBy: PRODUCT_ORDER,
      skip: (current - 1) * pageSize,
      take: pageSize,
      select: listSelect(locale),
    });

    return {
      items: toProductSummaries(rows, locale),
      total,
      page: current,
      pageSize,
      pageCount,
    };
  },
  ["products", "list"],
  CACHE_OPTIONS,
);

export interface ListPublishedProductsInput {
  locale: Locale;
  /** Restrict to one category. An unknown category has no products. */
  categorySlug?: string;
  /** 1-based; clamped into range. */
  page: number;
  pageSize: number;
}

/**
 * Published products, newest editor-ordered first, one page at a time. Each product is shown in
 * `locale`, or in English when it has no translation for it; products with neither are omitted.
 * The primary image comes first.
 */
export function listPublishedProducts(
  input: ListPublishedProductsInput,
): Promise<ProductsResult<ProductPage>> {
  const pageSize = Math.min(Math.max(Math.trunc(input.pageSize) || 1, 1), MAX_PRODUCTS_PAGE_SIZE);
  const page = Math.max(Math.trunc(input.page) || 1, 1);
  const { categorySlug } = input;

  if (categorySlug !== undefined && !isCategorySlug(categorySlug)) {
    return Promise.resolve({ ok: true, data: emptyPage(pageSize) });
  }
  return guarded("list", () => readPage(input.locale, categorySlug ?? null, page, pageSize));
}

const readDetail = unstable_cache(
  async (locale: Locale, categorySlug: string, slug: string): Promise<ProductDetail | null> => {
    const db = getDb();
    const now = new Date();
    const product = await db.product.findFirst({
      where: { ...visibleProducts({ now, locale, categorySlug }), slug },
      select: DETAIL_SELECT,
    });
    if (!product) return null;

    const relatedRows = await db.product.findMany({
      where: { ...visibleProducts({ now, locale, categorySlug }), slug: { not: slug } },
      orderBy: PRODUCT_ORDER,
      take: RELATED_PRODUCTS_COUNT,
      select: listSelect(locale),
    });
    return toProductDetail(product, toProductSummaries(relatedRows, locale), locale);
  },
  ["products", "detail"],
  CACHE_OPTIONS,
);

export interface GetPublishedProductInput {
  locale: Locale;
  categorySlug: string;
  slug: string;
}

/**
 * One published product with translations (own locale, else English), ordered specifications,
 * images (primary first), PUBLIC documents and related products of the same category. `data` is
 * null when no such product is published: unknown slug, wrong category, draft, archived, scheduled
 * for the future, or without a translation this locale can show.
 */
export function getPublishedProduct(
  input: GetPublishedProductInput,
): Promise<ProductsResult<ProductDetail | null>> {
  const { locale, categorySlug, slug } = input;
  if (!isCategorySlug(categorySlug) || slug.length === 0 || slug.length > MAX_SLUG_LENGTH) {
    return Promise.resolve({ ok: true, data: null });
  }
  return guarded("detail", () => readDetail(locale, categorySlug, slug));
}

const readCounts = unstable_cache(
  async (locale: Locale): Promise<CategoryProductCounts> => {
    const rows = await getDb().product.groupBy({
      by: ["categorySlug"],
      where: visibleProducts({ now: new Date(), locale }),
      _count: { _all: true },
    });

    const counts = Object.fromEntries(CATEGORY_SLUGS.map((slug) => [slug, 0])) as Record<
      string,
      number
    >;
    for (const row of rows) {
      if (isCategorySlug(row.categorySlug)) counts[row.categorySlug] = row._count._all;
    }
    return counts as CategoryProductCounts;
  },
  ["products", "counts"],
  CACHE_OPTIONS,
);

/**
 * Number of published products per category (zero for categories without any). Counts the
 * products that can be shown in `locale`, so it agrees with the listing; English by default.
 */
export function countPublishedByCategory(
  locale: Locale = DEFAULT_LOCALE,
): Promise<ProductsResult<CategoryProductCounts>> {
  return guarded("counts", () => readCounts(locale));
}
