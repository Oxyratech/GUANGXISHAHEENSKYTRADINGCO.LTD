import "server-only";
import { logger } from "@/lib/logger";
import { serverDeliveryWindow } from "@/lib/validation/dates";
import { createInquirySchema } from "@/lib/validation/inquiry";
import { deleteAsset, INQUIRY_ATTACHMENT, storeUpload, type AssetMeta } from "@/server/storage";
import { isDatabaseConfigured } from "@/server/db";
import { getRequestContext } from "@/server/http/request-context";
import { queueInquiryNotification } from "@/server/notifications";
import { createInquiry } from "./create-inquiry";
import { DATABASE_UNAVAILABLE, failureFromError, uploadFailure } from "./failure";
import { collectIssues, readSubmission } from "./form-data";
import { guardSubmission } from "./guard";
import type { ActionResult } from "./types";

/** A stored file that no inquiry ended up owning would sit in the database forever. */
async function discardOrphan(asset: AssetMeta): Promise<void> {
  try {
    await deleteAsset(asset.id);
  } catch (error) {
    logger.warn("inquiry.orphan_attachment_not_removed", { assetId: asset.id, error });
  }
}

/**
 * A business inquiry post: guard, validate, store the attachment, then the inquiry. It answers
 * success only when the inquiry is in the database and never throws, so the form always has
 * something honest to show. With no database, nothing is stored and the visitor is told so.
 */
export async function handleInquirySubmission(formData: FormData): Promise<ActionResult> {
  const guard = await guardSubmission({ formData, scope: "inquiry", prefix: "INQ" });
  if (!guard.proceed) return guard.result;

  if (!isDatabaseConfigured()) {
    logger.warn("inquiry.database_not_configured");
    return DATABASE_UNAVAILABLE;
  }

  const submission = readSubmission(formData);
  const parsed = createInquirySchema(serverDeliveryWindow()).safeParse(submission.fields);
  if (!parsed.success) return { ok: false, ...collectIssues(parsed.error.issues) };

  let attachment: AssetMeta | null = null;
  try {
    if (submission.attachment) {
      const stored = await storeUpload({ file: submission.attachment, policy: INQUIRY_ATTACHMENT });
      if (!stored.ok) return uploadFailure(stored.code);
      attachment = stored.asset;
    }

    const { ipHash, userAgent } = await getRequestContext();
    const submittedAt = new Date();
    const created = await createInquiry({
      data: parsed.data,
      locale: submission.locale,
      ipHash,
      userAgent,
      consentAcceptedAt: submittedAt,
      attachmentAssetId: attachment?.id ?? null,
    });

    logger.info("inquiry.created", {
      inquiryId: created.id,
      referenceCode: created.referenceCode,
      locale: submission.locale,
      hasAttachment: attachment !== null,
      linkedProduct: created.linkedProduct,
    });
    queueInquiryNotification({
      referenceCode: created.referenceCode,
      submittedAt,
      locale: submission.locale,
      data: parsed.data,
      attachment: attachment && { fileName: attachment.fileName, sizeBytes: attachment.sizeBytes },
    });
    return { ok: true, referenceCode: created.referenceCode };
  } catch (error) {
    if (attachment) await discardOrphan(attachment);
    return failureFromError("inquiry", error);
  }
}
