import type { Prisma } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/locales";
import type { PublishStatus } from "@/lib/domain/statuses";

/*
 * Column lists for every public news query. They name public columns only: no internal ids beyond
 * what a query needs to exclude an article from its own related list, no author account, no
 * version, and never a private asset's bytes.
 */

const PUBLISHED: PublishStatus = "PUBLISHED";

const NAME_TRANSLATIONS = { select: { locale: true, name: true } } as const;

export const CATEGORY_SELECT = {
  slug: true,
  translations: NAME_TRANSLATIONS,
} satisfies Prisma.NewsCategorySelect;

export const TAG_SELECT = {
  slug: true,
  translations: NAME_TRANSLATIONS,
} satisfies Prisma.NewsTagSelect;

export const IMAGE_SELECT = {
  id: true,
  kind: true,
  visibility: true,
  width: true,
  height: true,
  translations: { select: { locale: true, altText: true } },
} satisfies Prisma.MediaAssetSelect;

export const SUMMARY_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  publishedAt: true,
  createdAt: true,
  authorName: true,
  category: { select: CATEGORY_SELECT },
  tags: { select: { tag: { select: TAG_SELECT } } },
  cover: { select: IMAGE_SELECT },
} satisfies Prisma.NewsArticleSelect;

export const DETAIL_SELECT = {
  ...SUMMARY_SELECT,
  locale: true,
  translationGroupId: true,
  categoryId: true,
  content: true,
  updatedAt: true,
} satisfies Prisma.NewsArticleSelect;

export const SEO_SELECT = {
  title: true,
  description: true,
  noIndex: true,
  ogMedia: { select: IMAGE_SELECT },
} satisfies Prisma.SeoMetadataSelect;

export type SummaryRow = Prisma.NewsArticleGetPayload<{ select: typeof SUMMARY_SELECT }>;
export type DetailRow = Prisma.NewsArticleGetPayload<{ select: typeof DETAIL_SELECT }>;
export type ImageRow = Prisma.MediaAssetGetPayload<{ select: typeof IMAGE_SELECT }>;
export type SeoRow = Prisma.SeoMetadataGetPayload<{ select: typeof SEO_SELECT }>;

/** Newest first; the id makes page boundaries stable when two articles share a date. */
export const ARTICLE_ORDER = [
  { publishedAt: "desc" },
  { createdAt: "desc" },
  { id: "asc" },
] satisfies Prisma.NewsArticleOrderByWithRelationInput[];

/**
 * Public in every language: published, and not scheduled for the future. This is the rule the
 * sitemap uses too, so a page is listed exactly when it can be opened. A published row without a
 * publication date counts as already live.
 */
export function visibleWhere(now: Date): Prisma.NewsArticleWhereInput {
  return { status: PUBLISHED, OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] };
}

/** Public and written in `locale`: articles are authored per language, never machine-translated. */
export function publishedWhere(locale: Locale, now: Date): Prisma.NewsArticleWhereInput {
  return { locale, ...visibleWhere(now) };
}
