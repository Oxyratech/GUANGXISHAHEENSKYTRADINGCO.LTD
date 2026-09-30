import "server-only";
import type { MediaKind, MediaVisibility } from "@/lib/domain/statuses";
import { getDb, toDatabaseError } from "@/server/db";
import { buildPageMeta, type PageMeta, type PageParams } from "@/server/admin/pagination";
import type { MediaUsage } from "./usage";
import { findMediaUsage } from "./usage";

/*
 * Read-only queries behind the media library. Listings select only the columns the UI shows (never
 * blob bytes) and compute "used by" from lightweight relation counts; the full breakdown (with names
 * and links) is only fetched for the one asset a detail page opens (findMediaUsage).
 */

export interface MediaUsageCounts {
  productImages: number;
  productDocuments: number;
  newsCovers: number;
  seoOgImages: number;
  inquiryAttachments: number;
}

export interface MediaLibraryRow {
  id: string;
  kind: MediaKind;
  visibility: MediaVisibility;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width: number | null;
  height: number | null;
  uploadedBy: { id: string; name: string; email: string } | null;
  createdAt: Date;
  usage: MediaUsageCounts;
}

export interface MediaLibraryFilters {
  kind?: MediaKind;
  visibility?: MediaVisibility;
  search?: string;
}

const LIBRARY_SELECT = {
  id: true,
  kind: true,
  visibility: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  sha256: true,
  width: true,
  height: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true, email: true } },
  _count: {
    select: {
      productImages: true,
      productDocs: true,
      newsCovers: true,
      seoOgImages: true,
      attachments: true,
    },
  },
} as const;

interface LibraryRow {
  id: string;
  kind: string;
  visibility: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width: number | null;
  height: number | null;
  createdAt: Date;
  uploadedBy: { id: string; name: string; email: string } | null;
  _count: {
    productImages: number;
    productDocs: number;
    newsCovers: number;
    seoOgImages: number;
    attachments: number;
  };
}

function toLibraryRow(row: LibraryRow): MediaLibraryRow {
  return {
    id: row.id,
    kind: row.kind as MediaKind,
    visibility: row.visibility as MediaVisibility,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    width: row.width,
    height: row.height,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
    usage: {
      productImages: row._count.productImages,
      productDocuments: row._count.productDocs,
      newsCovers: row._count.newsCovers,
      seoOgImages: row._count.seoOgImages,
      inquiryAttachments: row._count.attachments,
    },
  };
}

/** The library listing: every MediaAsset, filterable by kind, visibility and file name. */
export async function listMediaLibrary(
  filters: MediaLibraryFilters,
  page: PageParams,
): Promise<{ rows: MediaLibraryRow[]; meta: PageMeta }> {
  const where = {
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.visibility ? { visibility: filters.visibility } : {}),
    ...(filters.search ? { fileName: { contains: filters.search } } : {}),
  };

  try {
    const db = getDb();
    const [total, rows] = await Promise.all([
      db.mediaAsset.count({ where }),
      db.mediaAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page.skip,
        take: page.take,
        select: LIBRARY_SELECT,
      }),
    ]);
    return { rows: rows.map(toLibraryRow), meta: buildPageMeta(total, page.page, page.pageSize) };
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export interface PrivateAttachmentRow {
  id: string;
  createdAt: Date;
  asset: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  };
  inquiry: {
    id: string;
    referenceCode: string;
    company: string;
    status: string;
  };
}

/** Buyer attachments, read-only, each linking back to the inquiry that owns it. */
export async function listPrivateAttachments(
  filters: { search?: string },
  page: PageParams,
): Promise<{ rows: PrivateAttachmentRow[]; meta: PageMeta }> {
  const where = filters.search
    ? {
        OR: [
          { mediaAsset: { fileName: { contains: filters.search } } },
          { inquiry: { referenceCode: { contains: filters.search } } },
        ],
      }
    : {};

  try {
    const db = getDb();
    const [total, rows] = await Promise.all([
      db.inquiryAttachment.count({ where }),
      db.inquiryAttachment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page.skip,
        take: page.take,
        select: {
          id: true,
          createdAt: true,
          mediaAsset: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
          inquiry: { select: { id: true, referenceCode: true, company: true, status: true } },
        },
      }),
    ]);
    return {
      rows: rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        asset: row.mediaAsset,
        inquiry: row.inquiry,
      })),
      meta: buildPageMeta(total, page.page, page.pageSize),
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export interface MediaAssetTranslationRow {
  locale: string;
  altText: string | null;
  caption: string | null;
}

export interface MediaAssetDetail {
  id: string;
  kind: MediaKind;
  visibility: MediaVisibility;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width: number | null;
  height: number | null;
  uploadedBy: { id: string; name: string; email: string } | null;
  createdAt: Date;
  translations: MediaAssetTranslationRow[];
  usage: MediaUsage;
}

/** Everything a detail page shows about one asset, or `null` when it does not exist. */
export async function getMediaAssetDetail(id: string): Promise<MediaAssetDetail | null> {
  try {
    const [row, usage] = await Promise.all([
      getDb().mediaAsset.findUnique({
        where: { id },
        select: {
          id: true,
          kind: true,
          visibility: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          sha256: true,
          width: true,
          height: true,
          createdAt: true,
          uploadedBy: { select: { id: true, name: true, email: true } },
          translations: { select: { locale: true, altText: true, caption: true } },
        },
      }),
      findMediaUsage(id),
    ]);
    if (!row || !usage) return null;

    return {
      id: row.id,
      kind: row.kind as MediaKind,
      visibility: row.visibility as MediaVisibility,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      sha256: row.sha256,
      width: row.width,
      height: row.height,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt,
      translations: row.translations,
      usage,
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
