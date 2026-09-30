import { z } from "zod";
import { isCategorySlug } from "@/content/categories";
import { LOCALES, type Locale } from "@/i18n/locales";
import { DOCUMENT_KINDS, PUBLISH_STATUSES, type DocumentKind } from "@/lib/domain/statuses";
import { checkbox, id, optionalString, requiredString, version } from "@/server/admin/action";
import { MAX_PRODUCT_DOCUMENTS, MAX_PRODUCT_IMAGES, MAX_PRODUCT_SPECIFICATIONS } from "./constants";

/*
 * Shared zod schemas for the product editor. Column sizes mirror prisma/schema.prisma exactly (see
 * the comment on each field); Markdown fields have no database limit (NVARCHAR(MAX)) but still need a
 * sane cap so a runaway paste cannot bloat the row indefinitely. Limits on child collections keep one
 * product from growing without bound.
 */

export { MAX_PRODUCT_IMAGES, MAX_PRODUCT_DOCUMENTS, MAX_PRODUCT_SPECIFICATIONS };

const MARKDOWN_MAX = 20_000;

export const LOCALE_TUPLE = LOCALES as unknown as [Locale, ...Locale[]];
export const localeField = z.enum(LOCALE_TUPLE, { error: "Unknown locale" });

/** Kebab-case, lower-case ASCII: "steel-wire-mesh". Matches Product.slug (NVARCHAR(120)). */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugField = z
  .string({ error: "Enter a slug." })
  .trim()
  .min(1, "Enter a slug.")
  .max(120, "At most 120 characters.")
  .regex(SLUG_PATTERN, "Use lower-case letters, numbers and hyphens only, e.g. steel-wire-mesh.");

export const categorySlugField = z
  .string({ error: "Choose a category." })
  .refine(isCategorySlug, { error: "Choose a valid category." });

export const originField = optionalString(120);

export const sortOrderField = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : (value ?? 0)),
  z.number({ error: "Enter a whole number." }).int().min(-1_000_000).max(1_000_000),
);

/** Product.slug is unique(120); ProductTranslation.name is NVARCHAR(200), required for English. */
export const productNameField = requiredString(200);
export const shortDescriptionField = optionalString(500);
export const packagingInfoField = optionalString(1000);

function markdownField() {
  return optionalString(MARKDOWN_MAX);
}
export const descriptionField = markdownField();
export const applicationsField = markdownField();

export const specLabelField = requiredString(200);
export const specValueField = requiredString(500);

export const documentTitleField = requiredString(200);

const DOCUMENT_KIND_TUPLE = DOCUMENT_KINDS as unknown as [DocumentKind, ...DocumentKind[]];
export const documentKindField = z.enum(DOCUMENT_KIND_TUPLE, { error: "Choose a document type." });

/**
 * `isPublishStatus` does not exist on `@/lib/domain/statuses` (only the inquiry lifecycle has one
 * there), so the product editor keeps its own guard here, built from the same `PUBLISH_STATUSES`
 * constant that the database CHECK constraint and the seed use.
 */
export function isPublishStatus(value: string): value is (typeof PUBLISH_STATUSES)[number] {
  return (PUBLISH_STATUSES as readonly string[]).includes(value);
}

export const publishStatusField = z
  .string({ error: "Choose a status." })
  .refine(isPublishStatus, { error: "Choose a valid status." });

/** The product editor's core-fields form (create and edit share it). */
export const productCoreSchema = z.object({
  name: productNameField,
  slug: slugField,
  categorySlug: categorySlugField,
  origin: originField,
  sortOrder: sortOrderField,
  featured: checkbox,
});

export const createProductSchema = productCoreSchema;

export const updateProductCoreSchema = productCoreSchema
  .omit({ name: true })
  .extend({ id, version });

export const productTranslationSchema = z.object({
  id,
  version,
  locale: localeField,
  // ProductTranslation.name is NOT NULL: every locale row that exists must carry a name, English
  // included — "English required to publish" is a separate, publish-time rule (see actions.ts).
  name: productNameField,
  shortDescription: shortDescriptionField,
  description: descriptionField,
  applications: applicationsField,
  packagingInfo: packagingInfoField,
});

export const changeProductStatusSchema = z.object({ id, version, status: publishStatusField });
export const deleteProductSchema = z.object({ id, version });

export const uploadProductImageSchema = z.object({
  productId: id,
  file: z.custom<File>((value) => value instanceof File, { error: "Choose a file." }),
});

export const setPrimaryProductImageSchema = z.object({ productId: id, imageId: id });
export const moveProductImageSchema = z.object({
  productId: id,
  imageId: id,
  direction: z.enum(["up", "down"]),
});
export const removeProductImageSchema = z.object({ productId: id, imageId: id });
export const updateProductImageTranslationSchema = z.object({
  productId: id,
  mediaAssetId: id,
  locale: localeField,
  altText: optionalString(300),
});

export const uploadProductDocumentSchema = z.object({
  productId: id,
  kind: documentKindField,
  file: z.custom<File>((value) => value instanceof File, { error: "Choose a file." }),
});
export const moveProductDocumentSchema = z.object({
  productId: id,
  documentId: id,
  direction: z.enum(["up", "down"]),
});
export const removeProductDocumentSchema = z.object({ productId: id, documentId: id });
export const updateProductDocumentTranslationSchema = z.object({
  productId: id,
  documentId: id,
  locale: localeField,
  title: documentTitleField,
});
export const setProductDocumentKindSchema = z.object({
  productId: id,
  documentId: id,
  kind: documentKindField,
});

export const addProductSpecificationSchema = z.object({ productId: id });
export const moveProductSpecificationSchema = z.object({
  productId: id,
  specificationId: id,
  direction: z.enum(["up", "down"]),
});
export const removeProductSpecificationSchema = z.object({ productId: id, specificationId: id });
export const updateProductSpecificationTranslationSchema = z.object({
  productId: id,
  specificationId: id,
  locale: localeField,
  label: specLabelField,
  value: specValueField,
});
