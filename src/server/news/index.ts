import "server-only";
import { unstable_cache } from "next/cache";
import type { Locale } from "@/i18n/locales";
import { logger } from "@/lib/logger";
import { DatabaseUnavailableError, isDatabaseConfigured, toDatabaseError } from "@/server/db";
import { readArticle, readArticlePage, type ArticlePageQuery } from "./articles";
import { NEWS_CACHE_TAG, NEWS_REVALIDATE_SECONDS } from "./cache";
import { readCategories } from "./categories";
import type { ArticleListPage, NewsCategorySummary, NewsResult, PublishedArticle } from "./types";

export { NEWS_CACHE_TAG, NEWS_REVALIDATE_SECONDS } from "./cache";
export type {
  ArticleListPage,
  ArticleSeo,
  ArticleSummary,
  NewsCategoryRef,
  NewsCategorySummary,
  NewsImage,
  NewsResult,
  NewsTagRef,
  PublishedArticle,
} from "./types";

/** `page` is 1-based; `categorySlug` and `tagSlug` narrow the list and may be combined. */
export type ListPublishedArticlesQuery = ArticlePageQuery;

/*
 * Read-only repository behind the public news pages. Each read is cached for five minutes under
 * the "news" tag and returns a NewsResult, so a page states the "database unavailable" case in
 * its types instead of relying on a caught exception. Without DATABASE_URL there can be no
 * article, so that case is an honest empty result rather than an error.
 *
 * SEO overrides live in SeoMetadata with scope "NEWS", refKey = the article row's id and the
 * article's own locale.
 */

const MAX_PAGE_SIZE = 50;
const cacheOptions = { revalidate: NEWS_REVALIDATE_SECONDS, tags: [NEWS_CACHE_TAG] };

// A throw inside a cached function is never cached, so an outage is not remembered for five minutes.
const cachedArticlePage = unstable_cache(readArticlePage, ["news", "articles"], cacheOptions);
const cachedArticle = unstable_cache(readArticle, ["news", "article"], cacheOptions);
const cachedCategories = unstable_cache(readCategories, ["news", "categories"], cacheOptions);

/** Prisma: the table (P2021) or column (P2022) does not exist yet, i.e. migrations have not run. */
const SCHEMA_NOT_READY_CODES = new Set(["P2021", "P2022"]);

function isStoreUnavailable(error: unknown): boolean {
  if (toDatabaseError(error) instanceof DatabaseUnavailableError) return true;
  const code =
    typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
  return typeof code === "string" && SCHEMA_NOT_READY_CODES.has(code);
}

async function guarded<T>(
  operation: string,
  whenNotConfigured: T,
  read: () => Promise<T>,
): Promise<NewsResult<T>> {
  if (!isDatabaseConfigured()) return { status: "ok", data: whenNotConfigured };
  try {
    return { status: "ok", data: await read() };
  } catch (error) {
    if (!isStoreUnavailable(error)) throw error;
    logger.warn(`news.${operation}_unavailable`, { error });
    return { status: "unavailable" };
  }
}

const wholeNumber = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.trunc(value) : fallback;

/**
 * Published articles written in `locale`, newest first. Category and tag names come back in the
 * reader's language with a fallback. `page` is clamped to at least 1 and `pageSize` to 1..50.
 */
export function listPublishedArticles(
  query: ListPublishedArticlesQuery,
): Promise<NewsResult<ArticleListPage>> {
  const page = Math.max(1, wholeNumber(query.page, 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, wholeNumber(query.pageSize, 1)));
  const normalized: ListPublishedArticlesQuery = {
    locale: query.locale,
    page,
    pageSize,
    ...(query.categorySlug ? { categorySlug: query.categorySlug } : {}),
    ...(query.tagSlug ? { tagSlug: query.tagSlug } : {}),
  };
  const empty: ArticleListPage = {
    items: [],
    total: 0,
    page,
    pageSize,
    pageCount: 0,
    activeTag: null,
  };
  return guarded("list", empty, () => cachedArticlePage(normalized));
}

/**
 * One published article in the requested language, or `data: null` when the slug is unknown or the
 * article is a draft, archived, scheduled for later or written in another language.
 */
export function getPublishedArticle(query: {
  locale: Locale;
  slug: string;
}): Promise<NewsResult<PublishedArticle | null>> {
  return guarded("article", null, () => cachedArticle({ locale: query.locale, slug: query.slug }));
}

/** Categories with at least one published article in `locale`, with counts. */
export function listCategories(query: {
  locale: Locale;
}): Promise<NewsResult<NewsCategorySummary[]>> {
  return guarded("categories", [], () => cachedCategories(query.locale));
}
