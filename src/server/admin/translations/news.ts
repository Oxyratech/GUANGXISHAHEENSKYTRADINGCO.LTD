import "server-only";
import { LOCALES, type Locale } from "@/i18n/locales";
import type { PublishStatus } from "@/lib/domain/statuses";
import { getDb, toDatabaseError } from "@/server/db";

export interface NewsGroupArticle {
  id: string;
  locale: Locale;
  title: string;
  status: PublishStatus;
}

export interface NewsGroupCoverage {
  translationGroupId: string;
  /** The English version's title, or the first version's when there is no English one. */
  title: string;
  articles: NewsGroupArticle[];
  locales: Locale[];
  missingLocales: Locale[];
}

/** Every story (translation group), grouping its language versions — real data only. */
export async function computeNewsTranslationCoverage(): Promise<NewsGroupCoverage[]> {
  try {
    const rows = await getDb().newsArticle.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, translationGroupId: true, locale: true, title: true, status: true },
    });

    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = groups.get(row.translationGroupId) ?? [];
      list.push(row);
      groups.set(row.translationGroupId, list);
    }

    return [...groups.entries()].map(([translationGroupId, articles]) => {
      const locales = LOCALES.filter((locale) => articles.some((a) => a.locale === locale));
      const representative = articles.find((a) => a.locale === "en") ?? articles[0];
      return {
        translationGroupId,
        title: representative?.title ?? "",
        articles: articles.map((a) => ({
          id: a.id,
          locale: a.locale as Locale,
          title: a.title,
          status: a.status as PublishStatus,
        })),
        locales,
        missingLocales: LOCALES.filter((locale) => !locales.includes(locale)),
      };
    });
  } catch (error) {
    throw toDatabaseError(error);
  }
}
