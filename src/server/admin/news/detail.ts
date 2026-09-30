import "server-only";
import type { Locale } from "@/i18n/locales";
import type { PublishStatus } from "@/lib/domain/statuses";
import { getDb, toDatabaseError } from "@/server/db";

export interface NewsArticleForEdit {
  id: string;
  version: number;
  translationGroupId: string;
  locale: Locale;
  slug: string;
  title: string;
  summary: string;
  content: string;
  coverMediaId: string | null;
  authorName: string | null;
  categoryId: string | null;
  status: PublishStatus;
  publishedAt: string | null;
  tagIds: string[];
  tagNames: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getNewsArticleForEdit(id: string): Promise<NewsArticleForEdit | null> {
  try {
    const row = await getDb().newsArticle.findUnique({
      where: { id },
      select: {
        id: true,
        version: true,
        translationGroupId: true,
        locale: true,
        slug: true,
        title: true,
        summary: true,
        content: true,
        coverMediaId: true,
        authorName: true,
        categoryId: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        tags: { select: { tag: { select: { id: true, slug: true, translations: true } } } },
      },
    });
    if (!row) return null;

    return {
      id: row.id,
      version: row.version,
      translationGroupId: row.translationGroupId,
      locale: row.locale as Locale,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      content: row.content,
      coverMediaId: row.coverMediaId,
      authorName: row.authorName,
      categoryId: row.categoryId,
      status: row.status as PublishStatus,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      tagIds: row.tags.map((link) => link.tag.id),
      tagNames: row.tags.map(
        (link) => link.tag.translations.find((t) => t.locale === "en")?.name ?? link.tag.slug,
      ),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export interface TranslationSibling {
  id: string;
  locale: Locale;
  title: string;
  status: PublishStatus;
}

/** Every language version of one story (the requested one included), for the "create translation" gate. */
export async function getTranslationSiblings(
  translationGroupId: string,
): Promise<TranslationSibling[]> {
  try {
    const rows = await getDb().newsArticle.findMany({
      where: { translationGroupId },
      select: { id: true, locale: true, title: true, status: true },
      orderBy: { locale: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      locale: row.locale as Locale,
      title: row.title,
      status: row.status as PublishStatus,
    }));
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export interface NewsFormOptions {
  categories: { id: string; slug: string; name: string }[];
  tags: { id: string; slug: string; name: string }[];
}

/** Options for the editor's category select and tag checklist, English label (admin is English-only). */
export async function getNewsFormOptions(): Promise<NewsFormOptions> {
  try {
    const db = getDb();
    const [categories, tags] = await Promise.all([
      db.newsCategory.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          translations: { where: { locale: "en" }, select: { name: true } },
        },
      }),
      db.newsTag.findMany({
        orderBy: { slug: "asc" },
        select: {
          id: true,
          slug: true,
          translations: { where: { locale: "en" }, select: { name: true } },
        },
      }),
    ]);
    return {
      categories: categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.translations[0]?.name ?? c.slug,
      })),
      tags: tags.map((t) => ({ id: t.id, slug: t.slug, name: t.translations[0]?.name ?? t.slug })),
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
