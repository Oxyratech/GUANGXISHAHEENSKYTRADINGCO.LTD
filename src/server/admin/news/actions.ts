"use server";

import { z } from "zod";
import { LOCALES, type Locale } from "@/i18n/locales";
import { PUBLISH_STATUSES, type PublishStatus } from "@/lib/domain/statuses";
import {
  AdminActionError,
  defineAdminAction,
  id,
  optionalString,
  requiredString,
  version,
} from "@/server/admin/action";
import { revalidateNews } from "@/server/admin/news/revalidate";
import { isNewsSlugTaken, isValidNewsSlug, suggestSlugFromTitle } from "@/server/admin/news/slug";
import { resolveTagIdsByNames } from "@/server/admin/news/tags/resolve";
import { updateWithVersion } from "@/server/admin/concurrency";
import { hasPermission } from "@/server/auth/authorize";
import { getDb } from "@/server/db";

/*
 * Server Actions behind the news editor. Every write requires news:write; publishing (creating or
 * changing status to PUBLISHED) additionally requires news:publish, checked inside the handler so the
 * one action covers "save as draft" and "save and publish" without two separate forms. Slug
 * uniqueness is per locale (see the schema's @@unique([locale, slug])), so the same story's English
 * and Chinese versions are free to use unrelated slugs.
 */

const LOCALE_TUPLE = LOCALES as unknown as [Locale, ...Locale[]];
const STATUS_TUPLE = PUBLISH_STATUSES as unknown as [PublishStatus, ...PublishStatus[]];

const localeField = z.enum(LOCALE_TUPLE, { error: "Choose a locale." });
const statusField = z.enum(STATUS_TUPLE, { error: "Choose a status." });
const slugField = z
  .string({ error: "Enter a slug." })
  .trim()
  .toLowerCase()
  .refine(isValidNewsSlug, "Use lowercase letters, numbers and hyphens only.");
const categoryIdField = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.union([id, z.null()]),
);
const coverMediaIdField = categoryIdField;
/** The tags field is one comma-separated text input ("create inline"): split, trim, drop blanks. */
const tagNamesField = z.preprocess(
  (value) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [],
  z.array(z.string().max(80)),
);

/** Blank means "not scheduled/published yet"; anything else must be a valid date-time. */
const publishedAtField = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .union([
      z.null(),
      z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date."),
    ])
    .optional(),
);

function requirePublishAllowed(status: PublishStatus, canPublish: boolean): void {
  if (status === "PUBLISHED" && !canPublish) {
    throw new AdminActionError("You do not have permission to publish news articles.", {
      status: ["You do not have permission to publish news articles."],
    });
  }
}

/** PUBLISHED with no explicit date defaults to now; DRAFT/ARCHIVED never carry a publish date forward. */
function resolvePublishedAt(status: PublishStatus, input: string | null | undefined): Date | null {
  if (status !== "PUBLISHED") return null;
  if (input) return new Date(input);
  return new Date();
}

const baseFields = {
  locale: localeField,
  slug: slugField,
  title: requiredString(250),
  summary: requiredString(600),
  content: requiredString(60_000),
  coverMediaId: coverMediaIdField,
  authorName: optionalString(120),
  categoryId: categoryIdField,
  status: statusField,
  publishedAt: publishedAtField,
  tagNames: tagNamesField,
};

export const createNewsArticle = defineAdminAction({
  name: "news.create",
  permission: "news:write",
  schema: z.object(baseFields),
  handler: async ({ input, session }) => {
    requirePublishAllowed(input.status, hasPermission(session, "news:publish"));
    if (await isNewsSlugTaken(input.locale, input.slug)) {
      const message = "That slug is already used in this locale.";
      throw new AdminActionError(message, { slug: [message] });
    }

    const db = getDb();
    if (input.coverMediaId) {
      const cover = await db.mediaAsset.findUnique({
        where: { id: input.coverMediaId },
        select: { kind: true, visibility: true },
      });
      if (!cover || cover.kind !== "IMAGE" || cover.visibility !== "PUBLIC") {
        const message = "Choose a public image from the media library.";
        throw new AdminActionError(message, { coverMediaId: [message] });
      }
    }

    const tagIds = await resolveTagIdsByNames(input.tagNames);
    const article = await db.newsArticle.create({
      data: {
        locale: input.locale,
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        content: input.content,
        coverMediaId: input.coverMediaId,
        authorId: session.user.id,
        authorName: input.authorName ?? session.user.name,
        categoryId: input.categoryId,
        status: input.status,
        publishedAt: resolvePublishedAt(input.status, input.publishedAt),
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      select: { id: true },
    });

    revalidateNews(article.id, input.locale, [input.slug]);
    return {
      data: { id: article.id },
      message: "Article created.",
      audit: {
        action: "news.created",
        entityType: "NewsArticle",
        entityId: article.id,
        summary: `${input.title} (${input.locale})`,
        metadata: { locale: input.locale, slug: input.slug, status: input.status },
      },
    };
  },
});

export const updateNewsArticle = defineAdminAction({
  name: "news.update",
  permission: "news:write",
  schema: z.object({ id, version, ...baseFields }),
  handler: async ({ input, session }) => {
    requirePublishAllowed(input.status, hasPermission(session, "news:publish"));

    const db = getDb();
    const current = await db.newsArticle.findUnique({
      where: { id: input.id },
      select: { locale: true, slug: true },
    });
    if (!current) throw new AdminActionError("This article no longer exists. Reload the page.");

    if (await isNewsSlugTaken(input.locale, input.slug, input.id)) {
      const message = "That slug is already used in this locale.";
      throw new AdminActionError(message, { slug: [message] });
    }
    if (input.coverMediaId) {
      const cover = await db.mediaAsset.findUnique({
        where: { id: input.coverMediaId },
        select: { kind: true, visibility: true },
      });
      if (!cover || cover.kind !== "IMAGE" || cover.visibility !== "PUBLIC") {
        const message = "Choose a public image from the media library.";
        throw new AdminActionError(message, { coverMediaId: [message] });
      }
    }

    const tagIds = await resolveTagIdsByNames(input.tagNames);
    await db.$transaction(async (tx) => {
      await updateWithVersion(
        tx.newsArticle,
        { id: input.id, version: input.version },
        {
          locale: input.locale,
          slug: input.slug,
          title: input.title,
          summary: input.summary,
          content: input.content,
          coverMediaId: input.coverMediaId,
          authorName: input.authorName ?? session.user.name,
          categoryId: input.categoryId,
          status: input.status,
          publishedAt: resolvePublishedAt(input.status, input.publishedAt),
        },
      );
      await tx.newsArticleTag.deleteMany({ where: { articleId: input.id } });
      if (tagIds.length > 0) {
        await tx.newsArticleTag.createMany({
          data: tagIds.map((tagId) => ({ articleId: input.id, tagId })),
        });
      }
    });

    const slugs = current.slug === input.slug ? [input.slug] : [current.slug, input.slug];
    revalidateNews(input.id, input.locale, slugs);
    if (current.locale !== input.locale) revalidateNews(input.id, current.locale, [current.slug]);

    return {
      data: { id: input.id },
      message: "Article saved.",
      audit: {
        action: "news.updated",
        entityType: "NewsArticle",
        entityId: input.id,
        summary: `${input.title} (${input.locale})`,
        metadata: { locale: input.locale, slug: input.slug, status: input.status },
      },
    };
  },
});

/** Quick publish/unpublish/archive from the list or detail page, without opening the full editor. */
export const setNewsStatus = defineAdminAction({
  name: "news.set_status",
  permission: "news:publish",
  schema: z.object({ id, version, status: statusField }),
  handler: async ({ input }) => {
    const db = getDb();
    const current = await db.newsArticle.findUnique({
      where: { id: input.id },
      select: { locale: true, slug: true, status: true, publishedAt: true },
    });
    if (!current) throw new AdminActionError("This article no longer exists. Reload the page.");
    if (current.status === input.status) {
      throw new AdminActionError("The article is already in this status.");
    }

    const publishedAt =
      input.status === "PUBLISHED" ? (current.publishedAt ?? new Date()) : current.publishedAt;
    await updateWithVersion(
      db.newsArticle,
      { id: input.id, version: input.version },
      { status: input.status, publishedAt },
    );

    revalidateNews(input.id, current.locale, [current.slug]);
    return {
      data: { status: input.status },
      message: `Status changed to ${input.status}.`,
      audit: {
        action: "news.status_changed",
        entityType: "NewsArticle",
        entityId: input.id,
        summary: `${current.status} → ${input.status}`,
      },
    };
  },
});

export const deleteNewsArticle = defineAdminAction({
  name: "news.delete",
  permission: "news:delete",
  schema: z.object({ id }),
  handler: async ({ input }) => {
    const db = getDb();
    const existing = await db.newsArticle.findUnique({
      where: { id: input.id },
      select: { title: true, locale: true, slug: true },
    });
    if (!existing) throw new AdminActionError("This article no longer exists. Reload the page.");

    await db.newsArticle.delete({ where: { id: input.id } });

    revalidateNews(undefined, existing.locale, [existing.slug]);
    return {
      data: { id: input.id },
      message: "Article deleted.",
      audit: {
        action: "news.deleted",
        entityType: "NewsArticle",
        entityId: input.id,
        summary: `${existing.title} (${existing.locale})`,
      },
    };
  },
});

export const createNewsTranslation = defineAdminAction({
  name: "news.create_translation",
  permission: "news:write",
  schema: z.object({ sourceId: id, targetLocale: localeField }),
  handler: async ({ input, session }) => {
    const db = getDb();
    const source = await db.newsArticle.findUnique({
      where: { id: input.sourceId },
      select: {
        translationGroupId: true,
        title: true,
        summary: true,
        content: true,
        coverMediaId: true,
        categoryId: true,
        authorName: true,
        tags: { select: { tagId: true } },
      },
    });
    if (!source) throw new AdminActionError("This article no longer exists. Reload the page.");

    const already = await db.newsArticle.findFirst({
      where: { translationGroupId: source.translationGroupId, locale: input.targetLocale },
      select: { id: true },
    });
    if (already) {
      throw new AdminActionError(`This story already has a ${input.targetLocale.toUpperCase()} version.`);
    }

    let slug = suggestSlugFromTitle(source.title);
    let suffix = 2;
    while (await isNewsSlugTaken(input.targetLocale, slug)) {
      slug = `${suggestSlugFromTitle(source.title)}-${suffix}`;
      suffix += 1;
    }

    const created = await db.newsArticle.create({
      data: {
        translationGroupId: source.translationGroupId,
        locale: input.targetLocale,
        slug,
        title: source.title,
        summary: source.summary,
        content: source.content,
        coverMediaId: source.coverMediaId,
        categoryId: source.categoryId,
        authorId: session.user.id,
        authorName: source.authorName,
        status: "DRAFT",
        tags: { create: source.tags.map((link) => ({ tagId: link.tagId })) },
      },
      select: { id: true },
    });

    revalidateNews(created.id, input.targetLocale, [slug]);
    return {
      data: { id: created.id },
      message: `${input.targetLocale.toUpperCase()} draft created from the source story. Translate its text before publishing.`,
      audit: {
        action: "news.translation_created",
        entityType: "NewsArticle",
        entityId: created.id,
        summary: `${input.targetLocale} translation of ${input.sourceId}`,
        metadata: { sourceId: input.sourceId, targetLocale: input.targetLocale },
      },
    };
  },
});
