"use server";

import { z } from "zod";
import { LOCALES, type Locale } from "@/i18n/locales";
import { AdminActionError, defineAdminAction, id, optionalString } from "@/server/admin/action";
import { getDb } from "@/server/db";
import { deleteAsset, getAssetMeta, storeUpload, type UploadErrorCode } from "@/server/storage";
import {
  ADMIN_UPLOAD_POLICIES,
  ADMIN_UPLOAD_POLICY_KEYS,
  type AdminUploadPolicyKey,
} from "./upload-policies";
import { describeMediaUsage, findMediaUsage, isMediaUsed } from "./usage";

/*
 * Server Actions for the media library. Upload is authoritative through storeUpload (the client's
 * hints from describeUploadPolicy are a courtesy only); translations are a plain last-write-wins
 * upsert (MediaAsset carries no `version`, see docs/DATABASE.md §4); delete refuses while any
 * relation still points at the asset, and every state change is audited with the file's name, size
 * and MIME type — never its bytes.
 */

const UPLOAD_ERROR_MESSAGES: Record<UploadErrorCode, string> = {
  too_large: "This file is larger than the limit for this upload type.",
  empty: "This file is empty.",
  type_not_allowed: "This file type is not accepted for this upload type.",
  mismatch: "The file's declared type does not match its contents.",
  image_too_large_pixels: "This image's dimensions are too large.",
  read_failed: "The file could not be read. It may be corrupted.",
};

export interface UploadedAssetSummary {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
  visibility: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

const UPLOAD_POLICY_TUPLE = ADMIN_UPLOAD_POLICY_KEYS as [
  AdminUploadPolicyKey,
  ...AdminUploadPolicyKey[],
];

const uploadSchema = z.object({
  policy: z.enum(UPLOAD_POLICY_TUPLE, { error: "Choose an upload type" }),
  file: z.custom<File>((value) => value instanceof File, { error: "Choose a file" }),
});

/** One file at a time: the upload panel calls this once per selected file, in sequence. */
export const uploadMediaAsset = defineAdminAction({
  name: "media.upload",
  permission: "media:upload",
  schema: uploadSchema,
  handler: async ({ input, session }) => {
    const policyEntry = ADMIN_UPLOAD_POLICIES[input.policy];
    const result = await storeUpload({
      file: input.file,
      policy: policyEntry.policy,
      uploadedById: session.user.id,
    });
    if (!result.ok) {
      const message = UPLOAD_ERROR_MESSAGES[result.code];
      throw new AdminActionError(message, { file: [message] });
    }

    const asset = result.asset;
    const summary: UploadedAssetSummary = {
      id: asset.id,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      kind: asset.kind,
      visibility: asset.visibility,
      width: asset.width,
      height: asset.height,
      createdAt: asset.createdAt.toISOString(),
    };
    return {
      data: summary,
      message: `Uploaded ${asset.fileName}`,
      audit: {
        action: "media.uploaded",
        entityType: "MediaAsset",
        entityId: asset.id,
        summary: asset.fileName,
        metadata: {
          name: asset.fileName,
          size: asset.sizeBytes,
          mime: asset.mimeType,
          policy: input.policy,
        },
      },
    };
  },
});

const LOCALE_TUPLE = LOCALES as unknown as [Locale, ...Locale[]];

const translationSchema = z.object({
  id,
  locale: z.enum(LOCALE_TUPLE, { error: "Unknown locale" }),
  altText: optionalString(300),
  caption: optionalString(500),
});

export interface MediaTranslationResult {
  locale: Locale;
  altText: string | null;
  caption: string | null;
}

/** Upserts the alt text and caption for one locale. Last write wins: there is no version to guard. */
export const updateMediaTranslation = defineAdminAction({
  name: "media.translation.update",
  permission: "media:upload",
  schema: translationSchema,
  handler: async ({ input }) => {
    const meta = await getAssetMeta(input.id);
    if (!meta) {
      throw new AdminActionError("This media asset no longer exists. Reload the page.");
    }

    const altText = input.altText ?? null;
    const caption = input.caption ?? null;
    await getDb().mediaAssetTranslation.upsert({
      where: { mediaAssetId_locale: { mediaAssetId: input.id, locale: input.locale } },
      create: { mediaAssetId: input.id, locale: input.locale, altText, caption },
      update: { altText, caption },
    });

    const result: MediaTranslationResult = { locale: input.locale, altText, caption };
    return {
      data: result,
      message: `Saved ${input.locale.toUpperCase()} text for ${meta.fileName}.`,
      audit: {
        action: "media.translation_updated",
        entityType: "MediaAsset",
        entityId: input.id,
        summary: `${input.locale}: alt/caption updated`,
        metadata: { locale: input.locale, altText, caption },
      },
    };
  },
});

const deleteSchema = z.object({ id });

/** Deletes an asset and its bytes, refusing while any product, article, SEO entry or inquiry uses it. */
export const deleteMediaAsset = defineAdminAction({
  name: "media.delete",
  permission: "media:delete",
  schema: deleteSchema,
  handler: async ({ input }) => {
    const meta = await getAssetMeta(input.id);
    if (!meta) {
      throw new AdminActionError("This media asset no longer exists. Reload the page.");
    }

    const usage = await findMediaUsage(input.id);
    if (usage && isMediaUsed(usage)) {
      const parts = describeMediaUsage(usage);
      throw new AdminActionError(
        `This asset is still used by ${parts.join(", ")}, so it cannot be deleted. Remove it from those places first.`,
      );
    }

    const result = await deleteAsset(input.id);
    if (result === "not_found") {
      throw new AdminActionError("This media asset no longer exists. Reload the page.");
    }
    if (result === "in_use") {
      throw new AdminActionError(
        "This asset started being used elsewhere while you were viewing it, so it cannot be deleted. Reload the page.",
      );
    }

    return {
      data: { id: input.id },
      message: `Deleted ${meta.fileName}.`,
      audit: {
        action: "media.deleted",
        entityType: "MediaAsset",
        entityId: input.id,
        summary: meta.fileName,
        metadata: { name: meta.fileName, size: meta.sizeBytes, mime: meta.mimeType },
      },
    };
  },
});
