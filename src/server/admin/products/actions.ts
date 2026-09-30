"use server";

import { isCategorySlug } from "@/content/categories";
import { AdminActionError, defineAdminAction } from "@/server/admin/action";
import { ConflictError, updateWithVersion } from "@/server/admin/concurrency";
import { getDb } from "@/server/db";
import { revalidateProduct } from "./revalidate";
import {
  changeProductStatusSchema,
  createProductSchema,
  deleteProductSchema,
  productTranslationSchema,
  updateProductCoreSchema,
} from "./schemas";

/*
 * Server Actions behind the product editor's core fields, its per-locale content and the
 * DRAFT -> PUBLISHED -> ARCHIVED workflow. Every write that can change what a visitor sees calls
 * revalidateProduct with the (categorySlug, slug) pairs it touched, in every locale.
 *
 * Product.version guards the whole aggregate: editing a translation bumps it exactly like editing a
 * core field does (in the same transaction as the translation upsert), so a stale "publish" click
 * right after someone else changed the name still gets a friendly conflict instead of clobbering it.
 * Images, documents and specifications are lower-contention child lists edited one row at a time (see
 * image-actions.ts, document-actions.ts, specification-actions.ts) and do not carry their own version.
 */

async function assertSlugAvailable(slug: string, excludingId?: string): Promise<void> {
  const existing = await getDb().product.findUnique({ where: { slug }, select: { id: true } });
  if (existing && existing.id !== excludingId) {
    throw new AdminActionError("That slug is already used by another product.", {
      slug: ["That slug is already used by another product."],
    });
  }
}

/** Creates a DRAFT product with its English name. Everything else is added on the editor page. */
export const createProduct = defineAdminAction({
  name: "products.create",
  permission: "product:write",
  schema: createProductSchema,
  handler: async ({ input, session }) => {
    await assertSlugAvailable(input.slug);

    const product = await getDb().product.create({
      data: {
        slug: input.slug,
        categorySlug: input.categorySlug,
        origin: input.origin ?? null,
        sortOrder: input.sortOrder,
        featured: input.featured,
        createdById: session.user.id,
        translations: { create: [{ locale: "en", name: input.name }] },
      },
      select: { id: true, version: true },
    });

    revalidateProduct(product.id, [{ categorySlug: input.categorySlug, slug: input.slug }]);
    return {
      data: { id: product.id, version: product.version },
      message: "Product created as a draft.",
      audit: {
        action: "product.created",
        entityType: "Product",
        entityId: product.id,
        summary: `${input.name} (${input.slug})`,
        metadata: { slug: input.slug, categorySlug: input.categorySlug },
      },
    };
  },
});

/** Slug, category, origin, sort order and the featured flag — everything not tied to a locale. */
export const updateProductCore = defineAdminAction({
  name: "products.update_core",
  permission: "product:write",
  schema: updateProductCoreSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const current = await db.product.findUnique({
      where: { id: input.id },
      select: { slug: true, categorySlug: true },
    });
    if (!current) throw new AdminActionError("This product no longer exists. Reload the page.");

    if (input.slug !== current.slug) await assertSlugAvailable(input.slug, input.id);

    await updateWithVersion(
      db.product,
      { id: input.id, version: input.version },
      {
        slug: input.slug,
        categorySlug: input.categorySlug,
        origin: input.origin ?? null,
        sortOrder: input.sortOrder,
        featured: input.featured,
      },
    );

    revalidateProduct(input.id, [
      { categorySlug: current.categorySlug, slug: current.slug },
      { categorySlug: input.categorySlug, slug: input.slug },
    ]);
    return {
      data: { id: input.id },
      message: "Product updated.",
      audit: {
        action: "product.updated",
        entityType: "Product",
        entityId: input.id,
        summary: `Core fields updated (${input.slug})`,
        metadata: { slug: input.slug, categorySlug: input.categorySlug, featured: input.featured },
      },
    };
  },
});

/** Upserts one locale's name/short description/description/applications/packaging in one save. */
export const upsertProductTranslation = defineAdminAction({
  name: "products.upsert_translation",
  permission: "product:write",
  schema: productTranslationSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const current = await db.product.findUnique({
      where: { id: input.id },
      select: { slug: true, categorySlug: true },
    });
    if (!current) throw new AdminActionError("This product no longer exists. Reload the page.");

    const data = {
      name: input.name,
      shortDescription: input.shortDescription ?? null,
      description: input.description ?? null,
      applications: input.applications ?? null,
      packagingInfo: input.packagingInfo ?? null,
    };

    await db.$transaction(async (tx) => {
      // The version check lives on the aggregate root: a translation is part of the same "record" a
      // reader compares by version, exactly like an inquiry's status change bumps BusinessInquiry.
      await updateWithVersion(tx.product, { id: input.id, version: input.version }, {});
      await tx.productTranslation.upsert({
        where: { productId_locale: { productId: input.id, locale: input.locale } },
        create: { productId: input.id, locale: input.locale, ...data },
        update: data,
      });
    });

    revalidateProduct(input.id, [{ categorySlug: current.categorySlug, slug: current.slug }]);
    return {
      data: { id: input.id, locale: input.locale },
      message: `Saved the ${input.locale.toUpperCase()} content.`,
      audit: {
        action: "product.translation_updated",
        entityType: "Product",
        entityId: input.id,
        summary: `${input.locale}: ${input.name}`,
        metadata: { locale: input.locale },
      },
    };
  },
});

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

/**
 * Moves a product through DRAFT -> PUBLISHED -> ARCHIVED (and back to DRAFT to unarchive). Publishing
 * requires an English name (always true once a translation row exists) and an English short
 * description, so a published product always has something to show on its category card.
 */
export const changeProductStatus = defineAdminAction({
  name: "products.change_status",
  permission: "product:publish",
  schema: changeProductStatusSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const current = await db.product.findUnique({
      where: { id: input.id },
      select: {
        status: true,
        slug: true,
        categorySlug: true,
        publishedAt: true,
        translations: { where: { locale: "en" }, select: { shortDescription: true } },
      },
    });
    if (!current) throw new AdminActionError("This product no longer exists. Reload the page.");
    if (current.status === input.status) {
      throw new AdminActionError(`The product is already ${STATUS_LABEL[input.status]}.`);
    }

    if (input.status === "PUBLISHED") {
      const english = current.translations[0];
      if (!english) {
        throw new AdminActionError(
          "Add the English content before publishing: an English name and category are required.",
        );
      }
      if (!english.shortDescription?.trim()) {
        throw new AdminActionError(
          "Add an English short description before publishing, so the category page has something to show.",
        );
      }
      if (!isCategorySlug(current.categorySlug)) {
        throw new AdminActionError("Choose a valid category before publishing.");
      }
    }

    const firstPublish = input.status === "PUBLISHED" && current.publishedAt === null;
    await updateWithVersion(
      db.product,
      { id: input.id, version: input.version },
      { status: input.status, ...(firstPublish ? { publishedAt: new Date() } : {}) },
    );

    revalidateProduct(input.id, [{ categorySlug: current.categorySlug, slug: current.slug }]);
    return {
      data: { id: input.id, status: input.status },
      message: `Status changed to ${STATUS_LABEL[input.status]}.`,
      audit: {
        action: "product.status_changed",
        entityType: "Product",
        entityId: input.id,
        summary: `${current.status} → ${input.status}`,
      },
    };
  },
});

/** Deletes the product and, in the same transaction, any media asset it used that nothing else uses. */
export const deleteProduct = defineAdminAction({
  name: "products.delete",
  permission: "product:delete",
  schema: deleteProductSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const current = await db.product.findUnique({
      where: { id: input.id },
      select: {
        slug: true,
        categorySlug: true,
        images: { select: { mediaAssetId: true } },
        documents: { select: { mediaAssetId: true } },
      },
    });
    if (!current) throw new AdminActionError("This product no longer exists. Reload the page.");

    const mediaAssetIds = [
      ...new Set([
        ...current.images.map((i) => i.mediaAssetId),
        ...current.documents.map((d) => d.mediaAssetId),
      ]),
    ];

    await db.$transaction(async (tx) => {
      const { count } = await tx.product.deleteMany({
        where: { id: input.id, version: input.version },
      });
      if (count === 0) throw new ConflictError();

      // Cascades already removed this product's ProductImage/ProductDocument rows; a shared
      // MediaAsset is NO ACTION (docs/DATABASE.md §1), so an asset only this product used is now an
      // orphan and is cleaned up here, in the same transaction as the delete.
      for (const mediaAssetId of mediaAssetIds) {
        const stillUsed = await tx.mediaAsset.findUnique({
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
        if (stillUsed && Object.values(stillUsed._count).every((count) => count === 0)) {
          await tx.mediaAsset.deleteMany({ where: { id: mediaAssetId } });
        }
      }
    });

    revalidateProduct(input.id, [{ categorySlug: current.categorySlug, slug: current.slug }]);
    return {
      data: { id: input.id },
      message: "Product deleted.",
      audit: {
        action: "product.deleted",
        entityType: "Product",
        entityId: input.id,
        summary: current.slug,
        metadata: { slug: current.slug, mediaAssetsChecked: mediaAssetIds.length },
      },
    };
  },
});
