"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { LOCALES, type Locale } from "@/i18n/locales";
import { SEO_SCOPES, type SeoScope } from "@/lib/domain/statuses";
import {
  AdminActionError,
  checkbox,
  defineAdminAction,
  id,
  optionalString,
  requiredString,
} from "@/server/admin/action";
import { getDb } from "@/server/db";
import { NEWS_CACHE_TAG } from "@/server/news";
import { PRODUCTS_CACHE_TAG } from "@/server/products";
import { SEO_CACHE_TAG } from "@/server/seo";

/*
 * Server Actions behind the SEO override editor. SeoMetadata carries no `version` column (see
 * prisma/schema.prisma): like a media translation, an override is a small last-write-wins upsert, not
 * a record editors race to change.
 *
 * Which cache tag a write must expire depends on how the scope's public page actually reads its
 * override: PAGE reads through @/server/seo/overrides (tag "seo"); CATEGORY and PRODUCT read through
 * the product catalogue's own override reader (tag "products", refKey = the category/product slug);
 * NEWS reads it joined into the article query (tag "news", refKey = the article row's id). Expiring
 * only "seo" would leave a category, product or news change waiting out the five-minute cache.
 */

const SCOPE_TUPLE = SEO_SCOPES as unknown as [SeoScope, ...SeoScope[]];
const LOCALE_TUPLE = LOCALES as unknown as [Locale, ...Locale[]];

const scopeField = z.enum(SCOPE_TUPLE, { error: "Unknown scope" });
const localeField = z.enum(LOCALE_TUPLE, { error: "Unknown locale" });
const refKeyField = requiredString(120);

/** Missing or "" (no image chosen) becomes null; anything else must be a real media id. */
const mediaIdField = z.preprocess(
  (value) =>
    value === undefined || (typeof value === "string" && value.trim() === "") ? null : value,
  z.union([id, z.null()]),
);

function revalidateSeo(scope: SeoScope) {
  revalidateTag(SEO_CACHE_TAG, { expire: 0 });
  if (scope === "CATEGORY" || scope === "PRODUCT") revalidateTag(PRODUCTS_CACHE_TAG, { expire: 0 });
  if (scope === "NEWS") revalidateTag(NEWS_CACHE_TAG, { expire: 0 });
  revalidatePath("/admin/seo");
}

export const saveSeoOverride = defineAdminAction({
  name: "seo.save_override",
  permission: "seo:write",
  schema: z.object({
    scope: scopeField,
    refKey: refKeyField,
    locale: localeField,
    title: optionalString(120),
    description: optionalString(320),
    noIndex: checkbox,
    ogMediaId: mediaIdField,
  }),
  handler: async ({ input, session }) => {
    const db = getDb();

    if (input.ogMediaId) {
      const media = await db.mediaAsset.findUnique({
        where: { id: input.ogMediaId },
        select: { kind: true, visibility: true },
      });
      if (!media || media.kind !== "IMAGE" || media.visibility !== "PUBLIC") {
        const message = "Choose a public image from the media library.";
        throw new AdminActionError(message, { ogMediaId: [message] });
      }
    }

    const data = {
      title: input.title ?? null,
      description: input.description ?? null,
      noIndex: input.noIndex,
      ogMediaId: input.ogMediaId,
      updatedById: session.user.id,
    };
    const row = await db.seoMetadata.upsert({
      where: {
        scope_refKey_locale: { scope: input.scope, refKey: input.refKey, locale: input.locale },
      },
      create: { scope: input.scope, refKey: input.refKey, locale: input.locale, ...data },
      update: data,
      select: { id: true },
    });

    revalidateSeo(input.scope);
    return {
      data: { id: row.id },
      message: "SEO override saved.",
      audit: {
        action: "seo.override_saved",
        entityType: "SeoMetadata",
        entityId: row.id,
        summary: `${input.scope} ${input.refKey} (${input.locale})`,
        metadata: { scope: input.scope, refKey: input.refKey, locale: input.locale },
      },
    };
  },
});

export const deleteSeoOverride = defineAdminAction({
  name: "seo.delete_override",
  permission: "seo:write",
  schema: z.object({ scope: scopeField, refKey: refKeyField, locale: localeField }),
  handler: async ({ input }) => {
    const db = getDb();
    const existing = await db.seoMetadata.findUnique({
      where: {
        scope_refKey_locale: { scope: input.scope, refKey: input.refKey, locale: input.locale },
      },
      select: { id: true },
    });
    if (!existing) {
      throw new AdminActionError("This override no longer exists. Reload the page.");
    }

    await db.seoMetadata.delete({ where: { id: existing.id } });

    revalidateSeo(input.scope);
    return {
      data: { id: existing.id },
      message: "Override deleted. The default metadata applies again.",
      audit: {
        action: "seo.override_deleted",
        entityType: "SeoMetadata",
        entityId: existing.id,
        summary: `${input.scope} ${input.refKey} (${input.locale})`,
        metadata: { scope: input.scope, refKey: input.refKey, locale: input.locale },
      },
    };
  },
});
