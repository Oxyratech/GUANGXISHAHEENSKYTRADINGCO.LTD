import "server-only";
import { findMediaAssetIds } from "@/components/news/media-path";
import type { Prisma } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/locales";
import type { MediaKind, MediaVisibility, SeoScope } from "@/lib/domain/statuses";
import { getDb } from "@/server/db";
import { toAlternates, toImage, toSeo, toSummary } from "./mapping";
import {
  ARTICLE_ORDER,
  DETAIL_SELECT,
  IMAGE_SELECT,
  SEO_SELECT,
  SUMMARY_SELECT,
  publishedWhere,
  visibleWhere,
} from "./select";
import type { ArticleListPage, NewsImage, PublishedArticle } from "./types";

const RELATED_COUNT = 3;
const NEWS_SCOPE: SeoScope = "NEWS";
const IMAGE: MediaKind = "IMAGE";
const PUBLIC: MediaVisibility = "PUBLIC";

export interface ArticlePageQuery {
  locale: Locale;
  categorySlug?: string;
  tagSlug?: string;
  page: number;
  pageSize: number;
}

/** One page of the newest published articles in a language, optionally for one category or tag. */
export async function readArticlePage(query: ArticlePageQuery): Promise<ArticleListPage> {
  const { locale, categorySlug, tagSlug, page, pageSize } = query;
  const db = getDb();
  const where: Prisma.NewsArticleWhereInput = {
    ...publishedWhere(locale, new Date()),
    ...(categorySlug ? { category: { is: { slug: categorySlug } } } : {}),
    ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
  };

  const [total, rows] = await Promise.all([
    db.newsArticle.count({ where }),
    db.newsArticle.findMany({
      where,
      select: SUMMARY_SELECT,
      orderBy: ARTICLE_ORDER,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = rows.map((row) => toSummary(row, locale));
  const wanted = tagSlug?.toLowerCase();
  const activeTag =
    wanted === undefined
      ? null
      : (items.flatMap((item) => item.tags).find((tag) => tag.slug.toLowerCase() === wanted) ??
        null);

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize), activeTag };
}

/** Same-category articles first, then the newest others, never the article itself. */
async function readRelated(
  locale: Locale,
  article: { id: string; categoryId: string | null },
  now: Date,
) {
  const db = getDb();
  const base = { ...publishedWhere(locale, now), id: { not: article.id } };

  const sameCategory = article.categoryId
    ? await db.newsArticle.findMany({
        where: { ...base, categoryId: article.categoryId },
        select: SUMMARY_SELECT,
        orderBy: ARTICLE_ORDER,
        take: RELATED_COUNT,
      })
    : [];
  if (sameCategory.length >= RELATED_COUNT) return sameCategory;

  const others = await db.newsArticle.findMany({
    where: { ...base, id: { notIn: [article.id, ...sameCategory.map((row) => row.id)] } },
    select: SUMMARY_SELECT,
    orderBy: ARTICLE_ORDER,
    take: RELATED_COUNT - sameCategory.length,
  });
  return [...sameCategory, ...others];
}

/** The public images an article body points at, keyed by lower-case asset id. */
async function readBodyImages(content: string, locale: Locale): Promise<Record<string, NewsImage>> {
  const ids = findMediaAssetIds(content);
  if (ids.length === 0) return {};

  const assets = await getDb().mediaAsset.findMany({
    where: { id: { in: ids }, kind: IMAGE, visibility: PUBLIC },
    select: IMAGE_SELECT,
  });
  return Object.fromEntries(
    assets.flatMap((asset) => {
      const image = toImage(asset, locale);
      return image ? [[asset.id.toLowerCase(), image]] : [];
    }),
  );
}

/**
 * A published article in the requested language, with everything its page needs (language
 * alternates, related articles, body images and the SEO override), or null when there is none:
 * unknown slug, draft, archived, scheduled for later, or written in another language.
 */
export async function readArticle(query: {
  locale: Locale;
  slug: string;
}): Promise<PublishedArticle | null> {
  const { locale, slug } = query;
  const db = getDb();
  const now = new Date();

  const row = await db.newsArticle.findFirst({
    where: { ...publishedWhere(locale, now), slug },
    select: DETAIL_SELECT,
  });
  if (!row) return null;

  const [versions, related, bodyImages, seo] = await Promise.all([
    db.newsArticle.findMany({
      where: { ...visibleWhere(now), translationGroupId: row.translationGroupId },
      select: { locale: true, slug: true },
      orderBy: { id: "asc" },
    }),
    readRelated(locale, row, now),
    readBodyImages(row.content, locale),
    db.seoMetadata.findUnique({
      where: { scope_refKey_locale: { scope: NEWS_SCOPE, refKey: row.id, locale } },
      select: SEO_SELECT,
    }),
  ]);

  return {
    ...toSummary(row, locale),
    locale,
    content: row.content,
    updatedAt: row.updatedAt.toISOString(),
    // The page being served always names itself, whatever else the group holds for its language.
    alternates: { ...toAlternates(versions), [locale]: row.slug },
    related: related.map((item) => toSummary(item, locale)),
    bodyImages,
    seo: toSeo(seo, locale),
  };
}
