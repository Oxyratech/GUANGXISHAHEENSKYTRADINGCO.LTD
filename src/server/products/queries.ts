import { CATEGORY_SLUGS } from "@/content/categories";
import type { Locale } from "@/i18n/locales";
import type { Prisma } from "@/generated/prisma/client";
import { translationLocales } from "./mappers";

/*
 * Query fragments shared by the repository. They define what a public visitor may see: which rows
 * are visible and which columns are ever selected. Internal columns (status, sortOrder, featured,
 * createdBy, version, ids of child rows) are not selected by any public query.
 */

/**
 * The rule the sitemap uses too: PUBLISHED, and either without a publication date or with one that
 * is not in the future. Only products that have a translation this locale can show (its own or
 * English) are visible in it, so counts, pages and lists always agree.
 */
export function visibleProducts(args: {
  now: Date;
  locale: Locale;
  categorySlug?: string | null;
}): Prisma.ProductWhereInput {
  return {
    status: "PUBLISHED",
    categorySlug: args.categorySlug ?? { in: [...CATEGORY_SLUGS] },
    OR: [{ publishedAt: null }, { publishedAt: { lte: args.now } }],
    translations: { some: { locale: { in: translationLocales(args.locale) } } },
  };
}

/** Featured products first, then the editor's order, then newest. The slug makes it deterministic. */
export const PRODUCT_ORDER = [
  { featured: "desc" },
  { sortOrder: "asc" },
  { publishedAt: "desc" },
  { slug: "asc" },
] satisfies Prisma.ProductOrderByWithRelationInput[];

/** Only images an editor made public; the primary image first, then the editor's order. */
const IMAGE_FILTER = { mediaAsset: { kind: "IMAGE", visibility: "PUBLIC" } } as const;
const IMAGE_ORDER = [{ isPrimary: "desc" }, { sortOrder: "asc" }] as const;

const IMAGE_FIELDS = {
  mediaAssetId: true,
  mediaAsset: {
    select: {
      width: true,
      height: true,
      translations: { select: { locale: true, altText: true } },
    },
  },
} satisfies Prisma.ProductImageSelect;

export function listSelect(locale: Locale) {
  return {
    slug: true,
    categorySlug: true,
    translations: {
      where: { locale: { in: translationLocales(locale) } },
      select: { locale: true, name: true, shortDescription: true },
    },
    images: {
      where: IMAGE_FILTER,
      orderBy: [...IMAGE_ORDER],
      take: 1,
      select: IMAGE_FIELDS,
    },
  } satisfies Prisma.ProductSelect;
}

export const DETAIL_SELECT = {
  slug: true,
  categorySlug: true,
  origin: true,
  publishedAt: true,
  updatedAt: true,
  translations: {
    select: {
      locale: true,
      name: true,
      shortDescription: true,
      description: true,
      applications: true,
      packagingInfo: true,
    },
  },
  images: {
    where: IMAGE_FILTER,
    orderBy: [...IMAGE_ORDER],
    select: IMAGE_FIELDS,
  },
  specifications: {
    orderBy: { sortOrder: "asc" },
    select: { translations: { select: { locale: true, label: true, value: true } } },
  },
  documents: {
    // Private assets are served only to authorised staff and are never listed here.
    where: { mediaAsset: { visibility: "PUBLIC" } },
    orderBy: { sortOrder: "asc" },
    select: {
      kind: true,
      mediaAssetId: true,
      mediaAsset: { select: { fileName: true, mimeType: true, sizeBytes: true } },
      translations: { select: { locale: true, title: true } },
    },
  },
} satisfies Prisma.ProductSelect;
