import "server-only";
import { getDb, toDatabaseError } from "@/server/db";

/*
 * Where a MediaAsset is used, read straight from its relations (docs/DATABASE.md §1 "Core
 * relationships"). This is the single place that answers "can this asset be deleted?" and "what
 * links here?" for the media library and, later, for product and news screens that embed media.
 */

export interface MediaUsageProduct {
  id: string;
  slug: string;
  /** The product's English name, or its first translation when English is missing. */
  name: string;
}

export interface MediaUsageNewsArticle {
  id: string;
  locale: string;
  slug: string;
  title: string;
}

export interface MediaUsageSeoEntry {
  id: string;
  scope: string;
  refKey: string;
  locale: string;
}

export interface MediaUsageInquiryAttachment {
  id: string;
  inquiryId: string;
  referenceCode: string;
}

export interface MediaUsage {
  productImages: MediaUsageProduct[];
  productDocuments: MediaUsageProduct[];
  newsCovers: MediaUsageNewsArticle[];
  seoOgImages: MediaUsageSeoEntry[];
  inquiryAttachments: MediaUsageInquiryAttachment[];
}

function productName(translations: readonly { locale: string; name: string }[]): string {
  return translations.find((t) => t.locale === "en")?.name ?? translations[0]?.name ?? "";
}

/** True when at least one relation references the asset, i.e. it cannot be deleted. */
export function isMediaUsed(usage: MediaUsage): boolean {
  return (
    usage.productImages.length > 0 ||
    usage.productDocuments.length > 0 ||
    usage.newsCovers.length > 0 ||
    usage.seoOgImages.length > 0 ||
    usage.inquiryAttachments.length > 0
  );
}

/** A short, human list of where the asset is used, for a delete refusal or a detail page. */
export function describeMediaUsage(usage: MediaUsage): string[] {
  const parts: string[] = [];
  if (usage.productImages.length > 0) {
    parts.push(
      `${usage.productImages.length} product image${usage.productImages.length === 1 ? "" : "s"}`,
    );
  }
  if (usage.productDocuments.length > 0) {
    parts.push(
      `${usage.productDocuments.length} product document${usage.productDocuments.length === 1 ? "" : "s"}`,
    );
  }
  if (usage.newsCovers.length > 0) {
    parts.push(`${usage.newsCovers.length} news cover${usage.newsCovers.length === 1 ? "" : "s"}`);
  }
  if (usage.seoOgImages.length > 0) {
    parts.push(
      `${usage.seoOgImages.length} SEO Open Graph image${usage.seoOgImages.length === 1 ? "" : "s"}`,
    );
  }
  if (usage.inquiryAttachments.length > 0) {
    parts.push(
      `${usage.inquiryAttachments.length} inquiry attachment${usage.inquiryAttachments.length === 1 ? "" : "s"}`,
    );
  }
  return parts;
}

/**
 * Every place a media asset is referenced. Returns `null` when the asset does not exist (a page or
 * action should treat that the same as "not found").
 */
export async function findMediaUsage(id: string): Promise<MediaUsage | null> {
  try {
    const row = await getDb().mediaAsset.findUnique({
      where: { id },
      select: {
        productImages: {
          select: {
            product: {
              select: {
                id: true,
                slug: true,
                translations: { select: { locale: true, name: true } },
              },
            },
          },
        },
        productDocs: {
          select: {
            product: {
              select: {
                id: true,
                slug: true,
                translations: { select: { locale: true, name: true } },
              },
            },
          },
        },
        newsCovers: { select: { id: true, locale: true, slug: true, title: true } },
        seoOgImages: { select: { id: true, scope: true, refKey: true, locale: true } },
        attachments: {
          select: {
            id: true,
            inquiryId: true,
            inquiry: { select: { referenceCode: true } },
          },
        },
      },
    });
    if (!row) return null;

    return {
      productImages: row.productImages.map((link) => ({
        id: link.product.id,
        slug: link.product.slug,
        name: productName(link.product.translations),
      })),
      productDocuments: row.productDocs.map((link) => ({
        id: link.product.id,
        slug: link.product.slug,
        name: productName(link.product.translations),
      })),
      newsCovers: row.newsCovers.map((article) => ({
        id: article.id,
        locale: article.locale,
        slug: article.slug,
        title: article.title,
      })),
      seoOgImages: row.seoOgImages.map((entry) => ({
        id: entry.id,
        scope: entry.scope,
        refKey: entry.refKey,
        locale: entry.locale,
      })),
      inquiryAttachments: row.attachments.map((attachment) => ({
        id: attachment.id,
        inquiryId: attachment.inquiryId,
        referenceCode: attachment.inquiry.referenceCode,
      })),
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
