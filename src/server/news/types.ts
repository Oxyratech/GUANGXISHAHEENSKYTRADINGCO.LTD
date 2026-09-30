import type { Locale } from "@/i18n/locales";

/*
 * Public shapes of the news repository. Everything here is JSON-safe (dates are ISO strings):
 * results pass through unstable_cache, which serialises them, so a Date would come back as a string
 * on a cache hit and as a Date on a miss.
 */

export interface NewsCategoryRef {
  slug: string;
  /** In the requested language, else English, else any language, else the slug. */
  name: string;
}

export type NewsTagRef = NewsCategoryRef;

/** A public image from the media library. Private assets and documents never become one. */
export interface NewsImage {
  /** Site-relative address, "/media/<id>". */
  src: string;
  width: number | null;
  height: number | null;
  /** Alt text written for the requested language (or English); null when the editor wrote none. */
  alt: string | null;
}

export interface ArticleSummary {
  slug: string;
  title: string;
  summary: string;
  /** ISO 8601. Falls back to the creation date for a published row that has no publication date. */
  publishedAt: string;
  /** The byline as edited in the admin area; never taken from the user account. */
  authorName: string | null;
  category: NewsCategoryRef | null;
  tags: NewsTagRef[];
  cover: NewsImage | null;
}

export interface ArticleListPage {
  items: ArticleSummary[];
  /** Published articles matching the filters, across all pages. */
  total: number;
  page: number;
  pageSize: number;
  /** 0 when nothing matches. */
  pageCount: number;
  /** The tag being filtered on, once an article of the result carries it. */
  activeTag: NewsTagRef | null;
}

export interface NewsCategorySummary extends NewsCategoryRef {
  /** Published articles in the requested language. */
  count: number;
}

/** Optional editor overrides from SeoMetadata (scope NEWS). */
export interface ArticleSeo {
  title: string | null;
  description: string | null;
  noIndex: boolean;
  image: NewsImage | null;
}

export interface PublishedArticle extends ArticleSummary {
  locale: Locale;
  /** Markdown, rendered without raw HTML. */
  content: string;
  /** ISO 8601. */
  updatedAt: string;
  /** Slug of every published language version of this story, the requested one included. */
  alternates: Partial<Record<Locale, string>>;
  related: ArticleSummary[];
  /** Public images the body refers to, by lower-case asset id. A body image not listed is not drawn. */
  bodyImages: Record<string, NewsImage>;
  seo: ArticleSeo | null;
}

/**
 * What a read returns. "unavailable" means the database could not be used (not reachable, or the
 * migrations have not run); any other failure is a bug and is thrown.
 */
export type NewsResult<T> = { status: "ok"; data: T } | { status: "unavailable" };
