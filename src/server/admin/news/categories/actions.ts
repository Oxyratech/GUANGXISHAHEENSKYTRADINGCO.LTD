"use server";

import { z } from "zod";
import { LOCALES } from "@/i18n/locales";
import { AdminActionError, defineAdminAction, id, requiredString } from "@/server/admin/action";
import { revalidateNewsEveryLocale } from "@/server/admin/news/revalidate";
import { getDb } from "@/server/db";

/*
 * Category management. NewsCategory carries no `version` column and is small, low-traffic reference
 * data edited by a handful of staff, so like SEO overrides it is a plain last-write-wins upsert of the
 * three locale names rather than optimistic-concurrency guarded.
 */

const slugField = z
  .string({ error: "Enter a slug." })
  .trim()
  .toLowerCase()
  .min(1, "Enter a slug.")
  .max(80, "At most 80 characters.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.");

const sortOrderField = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
  z.number({ error: "Enter a number." }).int().min(0).max(10_000),
);

const namesSchema = {
  name_en: requiredString(120),
  name_zh: requiredString(120),
  name_ar: requiredString(120),
};

function namesData(input: { name_en: string; name_zh: string; name_ar: string }) {
  return LOCALES.map((locale) => ({ locale, name: input[`name_${locale}`] }));
}

export const createNewsCategory = defineAdminAction({
  name: "news.categories.create",
  permission: "news:write",
  schema: z.object({ slug: slugField, sortOrder: sortOrderField, ...namesSchema }),
  handler: async ({ input }) => {
    const db = getDb();
    const existing = await db.newsCategory.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (existing) {
      const message = "That slug is already used by another category.";
      throw new AdminActionError(message, { slug: [message] });
    }

    const category = await db.newsCategory.create({
      data: {
        slug: input.slug,
        sortOrder: input.sortOrder,
        translations: { create: namesData(input) },
      },
      select: { id: true },
    });

    revalidateNewsEveryLocale();
    return {
      data: { id: category.id },
      message: "Category created.",
      audit: {
        action: "news.category_created",
        entityType: "NewsCategory",
        entityId: category.id,
        summary: input.slug,
        metadata: { slug: input.slug },
      },
    };
  },
});

export const updateNewsCategory = defineAdminAction({
  name: "news.categories.update",
  permission: "news:write",
  schema: z.object({ id, slug: slugField, sortOrder: sortOrderField, ...namesSchema }),
  handler: async ({ input }) => {
    const db = getDb();
    const conflict = await db.newsCategory.findFirst({
      where: { slug: input.slug, NOT: { id: input.id } },
      select: { id: true },
    });
    if (conflict) {
      const message = "That slug is already used by another category.";
      throw new AdminActionError(message, { slug: [message] });
    }

    const category = await db.newsCategory.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!category) throw new AdminActionError("This category no longer exists. Reload the page.");

    await db.$transaction([
      db.newsCategory.update({
        where: { id: input.id },
        data: { slug: input.slug, sortOrder: input.sortOrder },
      }),
      ...LOCALES.map((locale) =>
        db.newsCategoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: input.id, locale } },
          create: { categoryId: input.id, locale, name: input[`name_${locale}`] },
          update: { name: input[`name_${locale}`] },
        }),
      ),
    ]);

    revalidateNewsEveryLocale();
    return {
      data: { id: input.id },
      message: "Category updated.",
      audit: {
        action: "news.category_updated",
        entityType: "NewsCategory",
        entityId: input.id,
        summary: input.slug,
        metadata: { slug: input.slug },
      },
    };
  },
});
