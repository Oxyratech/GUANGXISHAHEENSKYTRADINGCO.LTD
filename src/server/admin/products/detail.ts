import "server-only";
import type { Locale } from "@/i18n/locales";
import type { DocumentKind, PublishStatus } from "@/lib/domain/statuses";
import { getDb } from "@/server/db";
import { toDatabaseError } from "@/server/db/errors";

/*
 * Everything the product editor shows about one product: every locale's translation (not just the
 * viewer's), every image and document with their per-locale text, and the raw specification rows so
 * the editor can show a locale tab per row. Nothing here is cached (see list.ts).
 */

export interface ProductEditTranslation {
  locale: Locale;
  name: string;
  shortDescription: string | null;
  description: string | null;
  applications: string | null;
  packagingInfo: string | null;
}

export interface ProductEditImage {
  id: string;
  mediaAssetId: string;
  sortOrder: number;
  isPrimary: boolean;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  translations: { locale: Locale; altText: string | null }[];
}

export interface ProductEditDocument {
  id: string;
  mediaAssetId: string;
  kind: DocumentKind;
  sortOrder: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  translations: { locale: Locale; title: string }[];
}

export interface ProductEditSpecification {
  id: string;
  sortOrder: number;
  translations: { locale: Locale; label: string; value: string }[];
}

export interface ProductEditDetail {
  id: string;
  slug: string;
  categorySlug: string;
  status: PublishStatus;
  origin: string | null;
  sortOrder: number;
  featured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  translations: ProductEditTranslation[];
  images: ProductEditImage[];
  documents: ProductEditDocument[];
  specifications: ProductEditSpecification[];
}

/**
 * Full detail for the editor, or `null` when the product does not exist. The select is written
 * inline (not lifted to a shared constant) so TypeScript's contextual typing resolves the `orderBy`
 * direction literals against Prisma's generated input types without needing `as const` scattered
 * through it (see src/server/products/queries.ts for the same trade-off with a lifted constant).
 */
export async function getProductForEdit(id: string): Promise<ProductEditDetail | null> {
  try {
    const row = await getDb().product.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        categorySlug: true,
        status: true,
        origin: true,
        sortOrder: true,
        featured: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        version: true,
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
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          select: {
            id: true,
            mediaAssetId: true,
            sortOrder: true,
            isPrimary: true,
            mediaAsset: {
              select: {
                fileName: true,
                mimeType: true,
                sizeBytes: true,
                width: true,
                height: true,
                translations: { select: { locale: true, altText: true } },
              },
            },
          },
        },
        documents: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            mediaAssetId: true,
            kind: true,
            sortOrder: true,
            mediaAsset: { select: { fileName: true, mimeType: true, sizeBytes: true } },
            translations: { select: { locale: true, title: true } },
          },
        },
        specifications: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            sortOrder: true,
            translations: { select: { locale: true, label: true, value: true } },
          },
        },
      },
    });
    if (!row) return null;
    return toDetail(row);
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/** By slug, for a friendlier "slug already taken by..." message. */
export async function findProductBySlug(
  slug: string,
): Promise<{ id: string; slug: string } | null> {
  try {
    return await getDb().product.findUnique({ where: { slug }, select: { id: true, slug: true } });
  } catch (error) {
    throw toDatabaseError(error);
  }
}

// The select above is bespoke (row shapes vary per relation), so the mapper takes `unknown` shaped by
// the same select and narrows it explicitly rather than fighting Prisma's generated payload type.
interface RawRow {
  id: string;
  slug: string;
  categorySlug: string;
  status: string;
  origin: string | null;
  sortOrder: number;
  featured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  translations: {
    locale: string;
    name: string;
    shortDescription: string | null;
    description: string | null;
    applications: string | null;
    packagingInfo: string | null;
  }[];
  images: {
    id: string;
    mediaAssetId: string;
    sortOrder: number;
    isPrimary: boolean;
    mediaAsset: {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      width: number | null;
      height: number | null;
      translations: { locale: string; altText: string | null }[];
    };
  }[];
  documents: {
    id: string;
    mediaAssetId: string;
    kind: string;
    sortOrder: number;
    mediaAsset: { fileName: string; mimeType: string; sizeBytes: number };
    translations: { locale: string; title: string }[];
  }[];
  specifications: {
    id: string;
    sortOrder: number;
    translations: { locale: string; label: string; value: string }[];
  }[];
}

function toDetail(row: RawRow): ProductEditDetail {
  return {
    id: row.id,
    slug: row.slug,
    categorySlug: row.categorySlug,
    status: row.status as PublishStatus,
    origin: row.origin,
    sortOrder: row.sortOrder,
    featured: row.featured,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
    translations: row.translations.map((t) => ({ ...t, locale: t.locale as Locale })),
    images: row.images.map((image) => ({
      id: image.id,
      mediaAssetId: image.mediaAssetId,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
      fileName: image.mediaAsset.fileName,
      mimeType: image.mediaAsset.mimeType,
      sizeBytes: image.mediaAsset.sizeBytes,
      width: image.mediaAsset.width,
      height: image.mediaAsset.height,
      translations: image.mediaAsset.translations.map((t) => ({
        locale: t.locale as Locale,
        altText: t.altText,
      })),
    })),
    documents: row.documents.map((doc) => ({
      id: doc.id,
      mediaAssetId: doc.mediaAssetId,
      kind: doc.kind as DocumentKind,
      sortOrder: doc.sortOrder,
      fileName: doc.mediaAsset.fileName,
      mimeType: doc.mediaAsset.mimeType,
      sizeBytes: doc.mediaAsset.sizeBytes,
      translations: doc.translations.map((t) => ({ locale: t.locale as Locale, title: t.title })),
    })),
    specifications: row.specifications.map((spec) => ({
      id: spec.id,
      sortOrder: spec.sortOrder,
      translations: spec.translations.map((t) => ({
        locale: t.locale as Locale,
        label: t.label,
        value: t.value,
      })),
    })),
  };
}
