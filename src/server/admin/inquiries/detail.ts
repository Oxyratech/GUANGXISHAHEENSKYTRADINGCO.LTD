import "server-only";
import { getDb } from "@/server/db";
import { toDatabaseError } from "@/server/db/errors";

/*
 * The full record behind an inquiry's detail page. Notes are internal-only (see InquiryNote in
 * prisma/schema.prisma): this is the one place they are read, and only because this module is admin-only
 * — no public query may ever select them. Attachments carry the fields the download list needs, never
 * the file bytes (those live in MediaBlob and are read only by the /files route).
 */

export interface InquiryDetailPerson {
  id: string;
  name: string;
  email: string;
}

export interface InquiryAttachmentRow {
  id: string;
  mediaAssetId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface InquiryNoteRow {
  id: string;
  body: string;
  createdAt: Date;
  author: InquiryDetailPerson | null;
}

export interface InquiryStatusChangeRow {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  createdAt: Date;
  changedBy: InquiryDetailPerson | null;
}

export interface InquiryDetail {
  id: string;
  referenceCode: string;
  status: string;
  version: number;
  name: string;
  company: string;
  country: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  productName: string;
  categorySlug: string | null;
  quantity: string | null;
  specification: string | null;
  targetPrice: string | null;
  destinationCountry: string | null;
  requiredDeliveryDate: Date | null;
  additionalRequirements: string | null;
  locale: string;
  consentAcceptedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  product: { id: string; slug: string; name: string } | null;
  assignedTo: InquiryDetailPerson | null;
  attachments: InquiryAttachmentRow[];
  notes: InquiryNoteRow[];
  statusChanges: InquiryStatusChangeRow[];
}

const PERSON_SELECT = { select: { id: true, name: true, email: true } } as const;

/** The inquiry's detail record, or `null` when the id does not exist. */
export async function getInquiryDetail(id: string): Promise<InquiryDetail | null> {
  try {
    const row = await getDb().businessInquiry.findUnique({
      where: { id },
      select: {
        id: true,
        referenceCode: true,
        status: true,
        version: true,
        name: true,
        company: true,
        country: true,
        email: true,
        phone: true,
        whatsapp: true,
        productName: true,
        categorySlug: true,
        quantity: true,
        specification: true,
        targetPrice: true,
        destinationCountry: true,
        requiredDeliveryDate: true,
        additionalRequirements: true,
        locale: true,
        consentAcceptedAt: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: PERSON_SELECT,
        product: {
          select: {
            id: true,
            slug: true,
            translations: { where: { locale: "en" }, take: 1, select: { name: true } },
          },
        },
        attachments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            createdAt: true,
            mediaAsset: {
              select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
            },
          },
        },
        notes: {
          orderBy: { createdAt: "asc" },
          select: { id: true, body: true, createdAt: true, author: PERSON_SELECT },
        },
        statusChanges: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            createdAt: true,
            changedBy: PERSON_SELECT,
          },
        },
      },
    });
    if (!row) return null;

    const { product, attachments, ...rest } = row;
    return {
      ...rest,
      product: product
        ? {
            id: product.id,
            slug: product.slug,
            name: product.translations[0]?.name ?? product.slug,
          }
        : null,
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        mediaAssetId: attachment.mediaAsset.id,
        fileName: attachment.mediaAsset.fileName,
        mimeType: attachment.mediaAsset.mimeType,
        sizeBytes: attachment.mediaAsset.sizeBytes,
        createdAt: attachment.createdAt,
      })),
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
