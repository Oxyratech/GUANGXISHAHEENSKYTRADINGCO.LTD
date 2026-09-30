import { mediaPath } from "@/components/news/media-path";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locales";
import type { MediaKind, MediaVisibility } from "@/lib/domain/statuses";
import type { ImageRow, SeoRow, SummaryRow } from "./select";
import type { ArticleSeo, ArticleSummary, NewsCategoryRef, NewsImage, NewsTagRef } from "./types";

const IMAGE: MediaKind = "IMAGE";
const PUBLIC: MediaVisibility = "PUBLIC";

/** The row for `locale`, else English, else the first language alphabetically (stable across runs). */
function pickTranslation<T extends { locale: string }>(
  rows: readonly T[],
  locale: Locale,
): T | undefined {
  return (
    rows.find((row) => row.locale === locale) ??
    rows.find((row) => row.locale === DEFAULT_LOCALE) ??
    [...rows].sort((a, b) => a.locale.localeCompare(b.locale))[0]
  );
}

const cleaned = (value: string | null | undefined): string | null => {
  const text = value?.trim();
  return text ? text : null;
};

/** Name of a category or tag in the reader's language, falling back so a label is never empty. */
export function localizedName(
  entity: { slug: string; translations: readonly { locale: string; name: string }[] },
  locale: Locale,
): NewsCategoryRef {
  return {
    slug: entity.slug,
    name: cleaned(pickTranslation(entity.translations, locale)?.name) ?? entity.slug,
  };
}

/**
 * A media asset as a public image, or null. Only PUBLIC images qualify: /media answers 404 for
 * anything private, and a document is not an image.
 */
export function toImage(media: ImageRow | null | undefined, locale: Locale): NewsImage | null {
  if (!media || media.kind !== IMAGE || media.visibility !== PUBLIC) return null;
  return {
    src: mediaPath(media.id),
    width: media.width,
    height: media.height,
    alt: cleaned(pickTranslation(media.translations, locale)?.altText),
  };
}

export function toSummary(row: SummaryRow, locale: Locale): ArticleSummary {
  const tags: NewsTagRef[] = row.tags
    .map(({ tag }) => localizedName(tag, locale))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    authorName: cleaned(row.authorName),
    category: row.category ? localizedName(row.category, locale) : null,
    tags,
    cover: toImage(row.cover, locale),
  };
}

/** The editor's SEO override, or null when there is none or it changes nothing. */
export function toSeo(row: SeoRow | null, locale: Locale): ArticleSeo | null {
  if (!row) return null;
  const seo: ArticleSeo = {
    title: cleaned(row.title),
    description: cleaned(row.description),
    noIndex: row.noIndex,
    image: toImage(row.ogMedia, locale),
  };
  return seo.title || seo.description || seo.noIndex || seo.image ? seo : null;
}

/** Slug per published language version; rows with a locale this site does not serve are ignored. */
export function toAlternates(
  versions: readonly { locale: string; slug: string }[],
): Partial<Record<Locale, string>> {
  const alternates: Partial<Record<Locale, string>> = {};
  for (const { locale, slug } of versions) {
    if (isLocale(locale)) alternates[locale] ??= slug;
  }
  return alternates;
}
