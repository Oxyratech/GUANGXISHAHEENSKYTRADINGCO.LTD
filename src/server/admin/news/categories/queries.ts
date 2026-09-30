import "server-only";
import { LOCALES, type Locale } from "@/i18n/locales";
import { getDb, toDatabaseError } from "@/server/db";

export interface NewsCategoryRow {
  id: string;
  slug: string;
  sortOrder: number;
  names: Record<Locale, string>;
  articleCount: number;
}

function toNames(
  translations: readonly { locale: string; name: string }[],
): Record<Locale, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, translations.find((t) => t.locale === locale)?.name ?? ""]),
  ) as Record<Locale, string>;
}

export async function listNewsCategories(): Promise<NewsCategoryRow[]> {
  try {
    const rows = await getDb().newsCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        sortOrder: true,
        translations: { select: { locale: true, name: true } },
        _count: { select: { articles: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      sortOrder: row.sortOrder,
      names: toNames(row.translations),
      articleCount: row._count.articles,
    }));
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export async function getNewsCategory(id: string): Promise<NewsCategoryRow | null> {
  try {
    const row = await getDb().newsCategory.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        sortOrder: true,
        translations: { select: { locale: true, name: true } },
        _count: { select: { articles: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      sortOrder: row.sortOrder,
      names: toNames(row.translations),
      articleCount: row._count.articles,
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
