"use server";

import { z } from "zod";
import { LOCALES } from "@/i18n/locales";
import { AdminActionError, defineAdminAction, id, requiredString } from "@/server/admin/action";
import { revalidateNewsEveryLocale } from "@/server/admin/news/revalidate";
import { getDb } from "@/server/db";

/** Give an inline-created tag (see ./resolve) proper wording in every locale, or fix its slug. */

const slugField = z
  .string({ error: "Enter a slug." })
  .trim()
  .toLowerCase()
  .min(1, "Enter a slug.")
  .max(80, "At most 80 characters.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.");

const namesSchema = {
  name_en: requiredString(80),
  name_zh: requiredString(80),
  name_ar: requiredString(80),
};

export const createNewsTag = defineAdminAction({
  name: "news.tags.create",
  permission: "news:write",
  schema: z.object({ slug: slugField, ...namesSchema }),
  handler: async ({ input }) => {
    const db = getDb();
    const existing = await db.newsTag.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (existing) {
      const message = "That slug is already used by another tag.";
      throw new AdminActionError(message, { slug: [message] });
    }

    const tag = await db.newsTag.create({
      data: {
        slug: input.slug,
        translations: {
          create: LOCALES.map((locale) => ({ locale, name: input[`name_${locale}`] })),
        },
      },
      select: { id: true },
    });

    revalidateNewsEveryLocale();
    return {
      data: { id: tag.id },
      message: "Tag created.",
      audit: {
        action: "news.tag_created",
        entityType: "NewsTag",
        entityId: tag.id,
        summary: input.slug,
      },
    };
  },
});

export const updateNewsTag = defineAdminAction({
  name: "news.tags.update",
  permission: "news:write",
  schema: z.object({ id, slug: slugField, ...namesSchema }),
  handler: async ({ input }) => {
    const db = getDb();
    const conflict = await db.newsTag.findFirst({
      where: { slug: input.slug, NOT: { id: input.id } },
      select: { id: true },
    });
    if (conflict) {
      const message = "That slug is already used by another tag.";
      throw new AdminActionError(message, { slug: [message] });
    }
    const tag = await db.newsTag.findUnique({ where: { id: input.id }, select: { id: true } });
    if (!tag) throw new AdminActionError("This tag no longer exists. Reload the page.");

    await db.$transaction([
      db.newsTag.update({ where: { id: input.id }, data: { slug: input.slug } }),
      ...LOCALES.map((locale) =>
        db.newsTagTranslation.upsert({
          where: { tagId_locale: { tagId: input.id, locale } },
          create: { tagId: input.id, locale, name: input[`name_${locale}`] },
          update: { name: input[`name_${locale}`] },
        }),
      ),
    ]);

    revalidateNewsEveryLocale();
    return {
      data: { id: input.id },
      message: "Tag updated.",
      audit: {
        action: "news.tag_updated",
        entityType: "NewsTag",
        entityId: input.id,
        summary: input.slug,
      },
    };
  },
});
