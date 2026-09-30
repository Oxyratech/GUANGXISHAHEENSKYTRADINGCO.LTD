import "server-only";
import type { Locale } from "@/i18n/locales";
import { CATEGORY_OTHER, type InquiryData } from "@/lib/validation/inquiry";
import { getDb, toDatabaseError } from "@/server/db";
import { createWithReferenceCode } from "./reference-code";

export interface NewInquiry {
  data: InquiryData;
  locale: Locale;
  ipHash: string;
  userAgent: string | null;
  consentAcceptedAt: Date;
  /** A stored, private file the visitor attached. */
  attachmentAssetId: string | null;
}

/** Empty optional fields are stored as NULL, not as empty strings. */
const orNull = (value: string): string | null => (value === "" ? null : value);

/** A `date` column holds no time: the calendar day at UTC midnight is exactly that day. */
const toDate = (isoDate: string): Date | null =>
  isoDate === "" ? null : new Date(`${isoDate}T00:00:00.000Z`);

/**
 * The product a link from a product page pointed at, if it is on the public site. Uses the same
 * visibility rule as the sitemap and the product pages: PUBLISHED, and not scheduled for later.
 * An unknown or unpublished slug is not an error; the inquiry is simply not linked to a product.
 */
async function findPublicProductId(slug: string): Promise<string | null> {
  if (slug === "") return null;
  const product = await getDb().product.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
    },
    select: { id: true },
  });
  return product?.id ?? null;
}

/**
 * Stores a business inquiry with its first status change (nothing -> NEW) and its attachment link.
 * They are one nested create, which Prisma runs as a single transaction: an inquiry never exists
 * without its history, and a failed insert leaves nothing behind.
 */
export async function createInquiry(
  input: NewInquiry,
): Promise<{ id: string; referenceCode: string; linkedProduct: boolean }> {
  const { data, locale, ipHash, userAgent, consentAcceptedAt, attachmentAssetId } = input;

  try {
    const productId = await findPublicProductId(data.productSlug);
    const created = await createWithReferenceCode("INQ", async (referenceCode) => {
      const row = await getDb().businessInquiry.create({
        data: {
          referenceCode,
          status: "NEW",
          name: data.name,
          company: data.company,
          country: data.country,
          email: data.email,
          phone: orNull(data.phone),
          whatsapp: orNull(data.whatsapp),
          productName: data.product,
          // "Other / not sure" and "not chosen" both mean: no specific category.
          categorySlug:
            data.category === "" || data.category === CATEGORY_OTHER ? null : data.category,
          quantity: orNull(data.quantity),
          specification: orNull(data.specification),
          targetPrice: orNull(data.targetPrice),
          destinationCountry: orNull(data.destinationCountry),
          requiredDeliveryDate: toDate(data.requiredDeliveryDate),
          additionalRequirements: orNull(data.additionalRequirements),
          productId,
          locale,
          consentAcceptedAt,
          ipHash,
          userAgent,
          statusChanges: { create: { fromStatus: null, toStatus: "NEW" } },
          ...(attachmentAssetId
            ? { attachments: { create: { mediaAssetId: attachmentAssetId } } }
            : {}),
        },
        select: { id: true },
      });
      return { id: row.id, referenceCode };
    });
    return { ...created, linkedProduct: productId !== null };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
