import { isCategorySlug } from "@/content/categories";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/locales";
import { DOCUMENT_KINDS, type DocumentKind } from "@/lib/domain/statuses";
import type {
  ProductDetail,
  ProductDocument,
  ProductSpecificationRow,
  ProductSummary,
  PublicProductImage,
} from "./types";

/*
 * Pure mapping from database rows to the public read models. Nothing here touches the database,
 * so locale fallback, image ordering and field selection are unit-tested without one.
 */

interface AltTranslationRow {
  locale: string;
  altText: string | null;
}

export interface ProductImageRow {
  mediaAssetId: string;
  mediaAsset: {
    width: number | null;
    height: number | null;
    translations: readonly AltTranslationRow[];
  };
}

export interface ProductListRow {
  slug: string;
  categorySlug: string;
  translations: readonly {
    locale: string;
    name: string;
    shortDescription: string | null;
  }[];
  images: readonly ProductImageRow[];
}

export interface ProductDetailRow {
  slug: string;
  categorySlug: string;
  origin: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  translations: readonly {
    locale: string;
    name: string;
    shortDescription: string | null;
    description: string | null;
    applications: string | null;
    packagingInfo: string | null;
  }[];
  images: readonly ProductImageRow[];
  specifications: readonly {
    translations: readonly { locale: string; label: string; value: string }[];
  }[];
  documents: readonly {
    kind: string;
    mediaAssetId: string;
    mediaAsset: { fileName: string; mimeType: string; sizeBytes: number };
    translations: readonly { locale: string; title: string }[];
  }[];
}

/** The requested locale first, then English, which is the language every product is written in. */
export function translationLocales(locale: Locale): Locale[] {
  return locale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [locale, DEFAULT_LOCALE];
}

export function pickTranslation<T extends { locale: string }>(
  rows: readonly T[],
  locale: Locale,
): { row: T; locale: Locale } | undefined {
  for (const candidate of translationLocales(locale)) {
    const row = rows.find((entry) => entry.locale === candidate);
    if (row) return { row, locale: candidate };
  }
  return undefined;
}

/** Locales (in site order) for which the rows hold a translation. */
export function translatedLocalesOf(rows: readonly { locale: string }[]): Locale[] {
  return LOCALES.filter((locale) => rows.some((row) => row.locale === locale));
}

/** Trims; empty or whitespace-only text becomes null so callers can test for presence. */
export function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function mediaPath(mediaAssetId: string): string {
  return `/media/${mediaAssetId}`;
}

export function toPublicImage(
  row: ProductImageRow,
  locale: Locale,
  fallbackAlt: string,
): PublicProductImage {
  const alt = textOrNull(pickTranslation(row.mediaAsset.translations, locale)?.row.altText);
  return {
    src: mediaPath(row.mediaAssetId),
    alt: alt ?? fallbackAlt,
    width: row.mediaAsset.width,
    height: row.mediaAsset.height,
  };
}

/**
 * A summary, or null when the product cannot be shown in this locale (no translation in it or in
 * English) or belongs to a category the site does not have. `images` must already be ordered
 * primary-first by the query.
 */
export function toProductSummary(row: ProductListRow, locale: Locale): ProductSummary | null {
  const picked = pickTranslation(row.translations, locale);
  if (!picked || !isCategorySlug(row.categorySlug)) return null;

  const { row: translation, locale: contentLocale } = picked;
  const primary = row.images[0];
  return {
    slug: row.slug,
    categorySlug: row.categorySlug,
    name: translation.name,
    shortDescription: textOrNull(translation.shortDescription),
    contentLocale,
    image: primary ? toPublicImage(primary, locale, translation.name) : null,
  };
}

export function toProductSummaries(
  rows: readonly ProductListRow[],
  locale: Locale,
): ProductSummary[] {
  return rows.flatMap((row) => {
    const summary = toProductSummary(row, locale);
    return summary ? [summary] : [];
  });
}

function toSpecifications(
  rows: ProductDetailRow["specifications"],
  locale: Locale,
): ProductSpecificationRow[] {
  return rows.flatMap((spec) => {
    const picked = pickTranslation(spec.translations, locale);
    if (!picked) return [];
    const label = textOrNull(picked.row.label);
    const value = textOrNull(picked.row.value);
    return label && value ? [{ label, value, contentLocale: picked.locale }] : [];
  });
}

function toDocumentKind(kind: string): DocumentKind {
  return (DOCUMENT_KINDS as readonly string[]).includes(kind) ? (kind as DocumentKind) : "OTHER";
}

function toDocuments(rows: ProductDetailRow["documents"], locale: Locale): ProductDocument[] {
  return rows.map((doc) => {
    const picked = pickTranslation(doc.translations, locale);
    const title = textOrNull(picked?.row.title);
    return {
      kind: toDocumentKind(doc.kind),
      title: title ?? doc.mediaAsset.fileName,
      contentLocale: title && picked ? picked.locale : locale,
      href: mediaPath(doc.mediaAssetId),
      fileName: doc.mediaAsset.fileName,
      mimeType: doc.mediaAsset.mimeType,
      sizeBytes: doc.mediaAsset.sizeBytes,
    };
  });
}

/** Full detail, or null when the product cannot be shown in this locale. */
export function toProductDetail(
  row: ProductDetailRow,
  related: readonly ProductSummary[],
  locale: Locale,
): ProductDetail | null {
  const picked = pickTranslation(row.translations, locale);
  if (!picked || !isCategorySlug(row.categorySlug)) return null;

  const { row: translation, locale: contentLocale } = picked;
  return {
    slug: row.slug,
    categorySlug: row.categorySlug,
    name: translation.name,
    shortDescription: textOrNull(translation.shortDescription),
    contentLocale,
    image: row.images[0] ? toPublicImage(row.images[0], locale, translation.name) : null,
    origin: textOrNull(row.origin),
    description: textOrNull(translation.description),
    applications: textOrNull(translation.applications),
    packagingInfo: textOrNull(translation.packagingInfo),
    images: row.images.map((image) => toPublicImage(image, locale, translation.name)),
    specifications: toSpecifications(row.specifications, locale),
    documents: toDocuments(row.documents, locale),
    related: [...related],
    translatedLocales: translatedLocalesOf(row.translations),
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}
