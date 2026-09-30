"use server";

import { AdminActionError, defineAdminAction, defineAdminInputAction } from "@/server/admin/action";
import { getDb } from "@/server/db";
import { PRODUCT_IMAGE, storeUpload } from "@/server/storage";
import { revalidateProduct } from "./revalidate";
import {
  MAX_PRODUCT_IMAGES,
  moveProductImageSchema,
  removeProductImageSchema,
  setPrimaryProductImageSchema,
  updateProductImageTranslationSchema,
  uploadProductImageSchema,
} from "./schemas";

/*
 * Server Actions behind the product editor's Images panel. Images are a lower-contention child list
 * (see actions.ts's note on why they do not carry their own version): each of these operates directly
 * on ProductImage/MediaAsset rows and reloads the page's data on success, which is enough for a single
 * editor working one product at a time.
 */

async function loadProductForRevalidate(productId: string) {
  const product = await getDb().product.findUnique({
    where: { id: productId },
    select: { slug: true, categorySlug: true },
  });
  if (!product) throw new AdminActionError("This product no longer exists. Reload the page.");
  return product;
}

/** Deletes the underlying MediaAsset too, but only if nothing else references it any more. */
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

/** Uploads a photo under the PRODUCT_IMAGE policy and attaches it, marking the first one primary. */
export const uploadProductImage = defineAdminAction({
  name: "products.image.upload",
  permission: "product:write",
  schema: uploadProductImageSchema,
  handler: async ({ input, session }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const existingCount = await db.productImage.count({ where: { productId: input.productId } });
    if (existingCount >= MAX_PRODUCT_IMAGES) {
      throw new AdminActionError(`A product can have at most ${MAX_PRODUCT_IMAGES} images.`);
    }

    const result = await storeUpload({
      file: input.file,
      policy: PRODUCT_IMAGE,
      uploadedById: session.user.id,
    });
    if (!result.ok) {
      const message =
        result.code === "type_not_allowed" || result.code === "mismatch"
          ? "Only JPEG, PNG and WebP images are accepted."
          : result.code === "too_large"
            ? "This image is larger than the upload limit."
            : "The image could not be uploaded.";
      throw new AdminActionError(message, { file: [message] });
    }

    const image = await db.productImage.create({
      data: {
        productId: input.productId,
        mediaAssetId: result.asset.id,
        sortOrder: existingCount,
        isPrimary: existingCount === 0,
      },
      select: { id: true },
    });

    revalidateProduct(input.productId, [product]);
    return {
      data: { id: image.id, mediaAssetId: result.asset.id },
      message: "Image uploaded.",
      audit: {
        action: "product.image_added",
        entityType: "Product",
        entityId: input.productId,
        summary: result.asset.fileName,
        metadata: { mediaAssetId: result.asset.id, fileName: result.asset.fileName },
      },
    };
  },
});

export const setPrimaryProductImage = defineAdminInputAction({
  name: "products.image.set_primary",
  permission: "product:write",
  schema: setPrimaryProductImageSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const image = await db.productImage.findFirst({
      where: { id: input.imageId, productId: input.productId },
      select: { id: true },
    });
    if (!image) throw new AdminActionError("This image no longer exists. Reload the page.");

    await db.$transaction([
      db.productImage.updateMany({
        where: { productId: input.productId },
        data: { isPrimary: false },
      }),
      db.productImage.update({ where: { id: input.imageId }, data: { isPrimary: true } }),
    ]);

    revalidateProduct(input.productId, [product]);
    return {
      data: { id: input.imageId },
      message: "Primary image updated.",
      audit: {
        action: "product.image_primary_set",
        entityType: "Product",
        entityId: input.productId,
        summary: `Primary image set to ${input.imageId}`,
      },
    };
  },
});

export const moveProductImage = defineAdminInputAction({
  name: "products.image.move",
  permission: "product:write",
  schema: moveProductImageSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const images = await db.productImage.findMany({
      where: { productId: input.productId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, sortOrder: true },
    });
    const index = images.findIndex((image) => image.id === input.imageId);
    if (index === -1) throw new AdminActionError("This image no longer exists. Reload the page.");

    const swapWith = input.direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= images.length) {
      return { data: { id: input.imageId }, message: "Already at that end." };
    }

    const a = images[index];
    const b = images[swapWith];
    await db.$transaction([
      db.productImage.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
      db.productImage.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
    ]);

    revalidateProduct(input.productId, [product]);
    return { data: { id: input.imageId }, message: "Order updated." };
  },
});

export const removeProductImage = defineAdminInputAction({
  name: "products.image.remove",
  permission: "product:write",
  schema: removeProductImageSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const image = await db.productImage.findFirst({
      where: { id: input.imageId, productId: input.productId },
      select: { id: true, mediaAssetId: true, isPrimary: true },
    });
    if (!image) throw new AdminActionError("This image no longer exists. Reload the page.");

    await db.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: image.id } });
      if (image.isPrimary) {
        const next = await tx.productImage.findFirst({
          where: { productId: input.productId },
          orderBy: { sortOrder: "asc" },
          select: { id: true },
        });
        if (next) await tx.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    });
    await deleteAssetIfOrphaned(image.mediaAssetId);

    revalidateProduct(input.productId, [product]);
    return {
      data: { id: input.imageId },
      message: "Image removed.",
      audit: {
        action: "product.image_removed",
        entityType: "Product",
        entityId: input.productId,
        summary: `Removed image ${image.mediaAssetId}`,
      },
    };
  },
});

/** Upserts one locale's alt text for a product image. Blank clears it (never required to publish). */
export const updateProductImageTranslation = defineAdminInputAction({
  name: "products.image.translation",
  permission: "product:write",
  schema: updateProductImageTranslationSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const image = await db.productImage.findFirst({
      where: { productId: input.productId, mediaAssetId: input.mediaAssetId },
      select: { id: true },
    });
    if (!image) throw new AdminActionError("This image no longer exists. Reload the page.");

    const altText = input.altText ?? null;
    await db.mediaAssetTranslation.upsert({
      where: { mediaAssetId_locale: { mediaAssetId: input.mediaAssetId, locale: input.locale } },
      create: { mediaAssetId: input.mediaAssetId, locale: input.locale, altText },
      update: { altText },
    });

    revalidateProduct(input.productId, [product]);
    return {
      data: { locale: input.locale, altText },
      message: `Saved ${input.locale.toUpperCase()} alt text.`,
      audit: {
        action: "product.image_translation_updated",
        entityType: "Product",
        entityId: input.productId,
        summary: `${input.locale} alt text updated`,
        metadata: { mediaAssetId: input.mediaAssetId, locale: input.locale },
      },
    };
  },
});
