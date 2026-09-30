import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/locales";
import { buildPageMeta, type PageMeta, type PageParams } from "@/server/admin/pagination";
import { getDb, toDatabaseError } from "@/server/db";
import type { NewsListFilters, NewsSort } from "./filters";

/*
 * The news list query: filters build one Prisma `where`, plus a second query for the sibling locales
 * of every translation group on the page (so the table can show "also in: ZH" without an N+1).
 */

export interface NewsListRow {
  id: string;
  locale: Locale;
  slug: string;
  title: string;
  status: string;
  publishedAt: string | null;
  authorName: string | null;
  category: { slug: string; name: string } | null;
  translationGroupId: string;
  /** Other locales this story already has, excluding this row's own. */
  siblingLocales: Locale[];
}

export interface NewsListResult {
  rows: NewsListRow[];
  meta: PageMeta;
}

function buildWhere(filters: NewsListFilters): Prisma.NewsArticleWhereInput {
  const where: Prisma.NewsArticleWhereInput = {};
  if (filters.locale) where.locale = filters.locale;
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = { slug: filters.category };
  if (filters.q) {
    const q = filters.q;
    where.OR = [{ title: { contains: q } }, { slug: { contains: q } }];
  }
  return where;
}

const ORDER_BY: Record<NewsSort, Prisma.NewsArticleOrderByWithRelationInput[]> = {
  newest: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  title: [{ title: "asc" }],
};

export async function listNewsArticles(
  filters: NewsListFilters,
  page: PageParams,
): Promise<NewsListResult> {
  const db = getDb();
  const where = buildWhere(filters);

  try {
    const [total, rows] = await Promise.all([
      db.newsArticle.count({ where }),
      db.newsArticle.findMany({
        where,
        orderBy: ORDER_BY[filters.sort],
        skip: page.skip,
        take: page.take,
        select: {
          id: true,
          locale: true,
          slug: true,
          title: true,
          status: true,
          publishedAt: true,
          authorName: true,
          translationGroupId: true,
          category: {
            select: { slug: true, translations: { where: { locale: "en" }, select: { name: true } } },
          },
        },
      }),
    ]);

    const groupIds = [...new Set(rows.map((row) => row.translationGroupId))];
    const siblings = groupIds.length
      ? await db.newsArticle.findMany({
          where: { translationGroupId: { in: groupIds } },
          select: { translationGroupId: true, locale: true },
        })
      : [];
    const localesByGroup = new Map<string, Locale[]>();
    for (const sibling of siblings) {
      const list = localesByGroup.get(sibling.translationGroupId) ?? [];
      list.push(sibling.locale as Locale);
      localesByGroup.set(sibling.translationGroupId, list);
    }

    return {
      rows: rows.map((row) => ({
        id: row.id,
        locale: row.locale as Locale,
        slug: row.slug,
        title: row.title,
        status: row.status,
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        authorName: row.authorName,
        category: row.category
          ? { slug: row.category.slug, name: row.category.translations[0]?.name ?? row.category.slug }
          : null,
        translationGroupId: row.translationGroupId,
        siblingLocales: (localesByGroup.get(row.translationGroupId) ?? []).filter(
          (locale) => locale !== row.locale,
        ),
      })),
      meta: buildPageMeta(total, page.page, page.pageSize),
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
