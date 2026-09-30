"use server";

import { AdminActionError, defineAdminAction, defineAdminInputAction } from "@/server/admin/action";
import { getDb } from "@/server/db";
import { PUBLIC_DOCUMENT, storeUpload } from "@/server/storage";
import { revalidateProduct } from "./revalidate";
import {
  MAX_PRODUCT_DOCUMENTS,
  moveProductDocumentSchema,
  removeProductDocumentSchema,
  setProductDocumentKindSchema,
  updateProductDocumentTranslationSchema,
  uploadProductDocumentSchema,
} from "./schemas";

/*
 * Server Actions behind the product editor's Documents panel: PDFs uploaded under the PUBLIC_DOCUMENT
 * policy, classified by kind and titled per locale. CERTIFICATE is never produced by this code — it is
 * only ever the kind a staff member chooses for a file they uploaded themselves, exactly like every
 * other document here.
 */

async function loadProductForRevalidate(productId: string) {
  const product = await getDb().product.findUnique({
    where: { id: productId },
    select: { slug: true, categorySlug: true },
  });
  if (!product) throw new AdminActionError("This product no longer exists. Reload the page.");
  return product;
}

async function deleteAssetIfOrphaned(mediaAssetId: string): Promise<void> {
  const db = getDb();
  const usage = await db.mediaAsset.findUnique({
    where: { id: mediaAssetId },
    select: {
      _count: {
        select: {
          productImages: true,
          productDocs: true,
          attachments: true,
          newsCovers: true,
          seoOgImages: true,
        },
      },
    },
  });
  if (usage && Object.values(usage._count).every((count) => count === 0)) {
    await db.mediaAsset.deleteMany({ where: { id: mediaAssetId } });
  }
}

export const uploadProductDocument = defineAdminAction({
  name: "products.document.upload",
  permission: "product:write",
  schema: uploadProductDocumentSchema,
  handler: async ({ input, session }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const existingCount = await db.productDocument.count({
      where: { productId: input.productId },
    });
    if (existingCount >= MAX_PRODUCT_DOCUMENTS) {
      throw new AdminActionError(`A product can have at most ${MAX_PRODUCT_DOCUMENTS} documents.`);
    }

    const result = await storeUpload({
      file: input.file,
      policy: PUBLIC_DOCUMENT,
      uploadedById: session.user.id,
    });
    if (!result.ok) {
      const message =
        result.code === "type_not_allowed" || result.code === "mismatch"
          ? "Only PDF files are accepted."
          : result.code === "too_large"
            ? "This file is larger than the upload limit."
            : "The file could not be uploaded.";
      throw new AdminActionError(message, { file: [message] });
    }

    const document = await db.productDocument.create({
      data: {
        productId: input.productId,
        mediaAssetId: result.asset.id,
        kind: input.kind,
        sortOrder: existingCount,
      },
      select: { id: true },
    });

    revalidateProduct(input.productId, [product]);
    return {
      data: { id: document.id, mediaAssetId: result.asset.id },
      message: "Document uploaded.",
      audit: {
        action: "product.document_added",
        entityType: "Product",
        entityId: input.productId,
        summary: `${input.kind}: ${result.asset.fileName}`,
        metadata: {
          mediaAssetId: result.asset.id,
          fileName: result.asset.fileName,
          kind: input.kind,
        },
      },
    };
  },
});

export const moveProductDocument = defineAdminInputAction({
  name: "products.document.move",
  permission: "product:write",
  schema: moveProductDocumentSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const documents = await db.productDocument.findMany({
      where: { productId: input.productId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, sortOrder: true },
    });
    const index = documents.findIndex((doc) => doc.id === input.documentId);
    if (index === -1)
      throw new AdminActionError("This document no longer exists. Reload the page.");

    const swapWith = input.direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= documents.length) {
      return { data: { id: input.documentId }, message: "Already at that end." };
    }

    const a = documents[index];
    const b = documents[swapWith];
    await db.$transaction([
      db.productDocument.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
      db.productDocument.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
    ]);

    revalidateProduct(input.productId, [product]);
    return { data: { id: input.documentId }, message: "Order updated." };
  },
});

export const removeProductDocument = defineAdminInputAction({
  name: "products.document.remove",
  permission: "product:write",
  schema: removeProductDocumentSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const document = await db.productDocument.findFirst({
      where: { id: input.documentId, productId: input.productId },
      select: { id: true, mediaAssetId: true },
    });
    if (!document) throw new AdminActionError("This document no longer exists. Reload the page.");

    await db.productDocument.delete({ where: { id: document.id } });
    await deleteAssetIfOrphaned(document.mediaAssetId);

    revalidateProduct(input.productId, [product]);
    return {
      data: { id: input.documentId },
      message: "Document removed.",
      audit: {
        action: "product.document_removed",
        entityType: "Product",
        entityId: input.productId,
        summary: `Removed document ${document.mediaAssetId}`,
      },
    };
  },
});

export const setProductDocumentKind = defineAdminInputAction({
  name: "products.document.set_kind",
  permission: "product:write",
  schema: setProductDocumentKindSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const document = await db.productDocument.findFirst({
      where: { id: input.documentId, productId: input.productId },
      select: { id: true },
    });
    if (!document) throw new AdminActionError("This document no longer exists. Reload the page.");

    await db.productDocument.update({ where: { id: document.id }, data: { kind: input.kind } });

    revalidateProduct(input.productId, [product]);
    return {
      data: { id: input.documentId, kind: input.kind },
      message: "Document type updated.",
      audit: {
        action: "product.document_kind_changed",
        entityType: "Product",
        entityId: input.productId,
        summary: `Document kind set to ${input.kind}`,
      },
    };
  },
});

/** Upserts one locale's title for a document. Title is required (ProductDocumentTranslation.title). */
export const updateProductDocumentTranslation = defineAdminInputAction({
  name: "products.document.translation",
  permission: "product:write",
  schema: updateProductDocumentTranslationSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const document = await db.productDocument.findFirst({
      where: { id: input.documentId, productId: input.productId },
      select: { id: true },
    });
    if (!document) throw new AdminActionError("This document no longer exists. Reload the page.");

    await db.productDocumentTranslation.upsert({
      where: { documentId_locale: { documentId: input.documentId, locale: input.locale } },
      create: { documentId: input.documentId, locale: input.locale, title: input.title },
      update: { title: input.title },
    });

    revalidateProduct(input.productId, [product]);
    return {
      data: { locale: input.locale, title: input.title },
      message: `Saved ${input.locale.toUpperCase()} title.`,
      audit: {
        action: "product.document_translation_updated",
        entityType: "Product",
        entityId: input.productId,
        summary: `${input.locale}: ${input.title}`,
      },
    };
  },
});
