"use server";

import { AdminActionError, defineAdminInputAction } from "@/server/admin/action";
import { getDb } from "@/server/db";
import { revalidateProduct } from "./revalidate";
import {
  addProductSpecificationSchema,
  MAX_PRODUCT_SPECIFICATIONS,
  moveProductSpecificationSchema,
  removeProductSpecificationSchema,
  updateProductSpecificationTranslationSchema,
} from "./schemas";

/*
 * Server Actions behind the Specifications editor: ordered rows, each with a label/value per locale.
 * A row (ProductSpecification) is language-neutral; add/remove/reorder act on the row itself, while
 * updateProductSpecificationTranslation fills in one locale's label and value.
 */

async function loadProductForRevalidate(productId: string) {
  const product = await getDb().product.findUnique({
    where: { id: productId },
    select: { slug: true, categorySlug: true },
  });
  if (!product) throw new AdminActionError("This product no longer exists. Reload the page.");
  return product;
}

/** Adds a blank row at the end of the list; the editor then fills in each locale's text. */
export const addProductSpecification = defineAdminInputAction({
  name: "products.specification.add",
  permission: "product:write",
  schema: addProductSpecificationSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const existingCount = await db.productSpecification.count({
      where: { productId: input.productId },
    });
    if (existingCount >= MAX_PRODUCT_SPECIFICATIONS) {
      throw new AdminActionError(
        `A product can have at most ${MAX_PRODUCT_SPECIFICATIONS} specification rows.`,
      );
    }

    const specification = await db.productSpecification.create({
      data: { productId: input.productId, sortOrder: existingCount },
      select: { id: true },
    });

    revalidateProduct(input.productId, [product]);
    return {
      data: { id: specification.id },
      message: "Specification row added.",
      audit: {
        action: "product.specification_added",
        entityType: "Product",
        entityId: input.productId,
        summary: "Specification row added",
      },
    };
  },
});

export const moveProductSpecification = defineAdminInputAction({
  name: "products.specification.move",
  permission: "product:write",
  schema: moveProductSpecificationSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const rows = await db.productSpecification.findMany({
      where: { productId: input.productId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, sortOrder: true },
    });
    const index = rows.findIndex((row) => row.id === input.specificationId);
    if (index === -1) {
      throw new AdminActionError("This specification row no longer exists. Reload the page.");
    }

    const swapWith = input.direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= rows.length) {
      return { data: { id: input.specificationId }, message: "Already at that end." };
    }

    const a = rows[index];
    const b = rows[swapWith];
    await db.$transaction([
      db.productSpecification.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
      db.productSpecification.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
    ]);

    revalidateProduct(input.productId, [product]);
    return { data: { id: input.specificationId }, message: "Order updated." };
  },
});

export const removeProductSpecification = defineAdminInputAction({
  name: "products.specification.remove",
  permission: "product:write",
  schema: removeProductSpecificationSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const row = await db.productSpecification.findFirst({
      where: { id: input.specificationId, productId: input.productId },
      select: { id: true },
    });
    if (!row) {
      throw new AdminActionError("This specification row no longer exists. Reload the page.");
    }

    await db.productSpecification.delete({ where: { id: row.id } });

    revalidateProduct(input.productId, [product]);
    return {
      data: { id: input.specificationId },
      message: "Specification row removed.",
      audit: {
        action: "product.specification_removed",
        entityType: "Product",
        entityId: input.productId,
        summary: "Specification row removed",
      },
    };
  },
});

/** Upserts one locale's label/value for a specification row. Both are required when saved. */
export const updateProductSpecificationTranslation = defineAdminInputAction({
  name: "products.specification.translation",
  permission: "product:write",
  schema: updateProductSpecificationTranslationSchema,
  handler: async ({ input }) => {
    const db = getDb();
    const product = await loadProductForRevalidate(input.productId);
    const row = await db.productSpecification.findFirst({
      where: { id: input.specificationId, productId: input.productId },
      select: { id: true },
    });
    if (!row) {
      throw new AdminActionError("This specification row no longer exists. Reload the page.");
    }

    await db.productSpecificationTranslation.upsert({
      where: {
        specificationId_locale: { specificationId: input.specificationId, locale: input.locale },
      },
      create: {
        specificationId: input.specificationId,
        locale: input.locale,
        label: input.label,
        value: input.value,
      },
      update: { label: input.label, value: input.value },
    });

    revalidateProduct(input.productId, [product]);
    return {
      data: { locale: input.locale, label: input.label, value: input.value },
      message: `Saved ${input.locale.toUpperCase()} row.`,
      audit: {
        action: "product.specification_translation_updated",
        entityType: "Product",
        entityId: input.productId,
        summary: `${input.locale}: ${input.label} = ${input.value}`,
      },
    };
  },
});
