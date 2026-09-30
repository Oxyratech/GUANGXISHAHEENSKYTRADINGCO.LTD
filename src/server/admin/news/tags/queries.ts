import "server-only";
import { LOCALES, type Locale } from "@/i18n/locales";
import { getDb, toDatabaseError } from "@/server/db";

export interface NewsTagRow {
  id: string;
  slug: string;
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

export async function listNewsTags(): Promise<NewsTagRow[]> {
  try {
    const rows = await getDb().newsTag.findMany({
      orderBy: { slug: "asc" },
      select: {
        id: true,
        slug: true,
        translations: { select: { locale: true, name: true } },
        _count: { select: { articles: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      names: toNames(row.translations),
      articleCount: row._count.articles,
    }));
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export async function getNewsTag(id: string): Promise<NewsTagRow | null> {
  try {
    const row = await getDb().newsTag.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        translations: { select: { locale: true, name: true } },
        _count: { select: { articles: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      names: toNames(row.translations),
      articleCount: row._count.articles,
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
