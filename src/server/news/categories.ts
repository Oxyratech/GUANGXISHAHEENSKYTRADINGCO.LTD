import "server-only";
import type { Locale } from "@/i18n/locales";
import { getDb } from "@/server/db";
import { localizedName } from "./mapping";
import { publishedWhere } from "./select";
import type { NewsCategorySummary } from "./types";

/**
 * Categories that have at least one published article in `locale`, with that count, in the order
 * the editor set (then by slug). An empty category is left out: a filter that leads nowhere is noise.
 */
export async function readCategories(locale: Locale): Promise<NewsCategorySummary[]> {
  const rows = await getDb().newsCategory.findMany({
    select: {
      slug: true,
      translations: { select: { locale: true, name: true } },
      _count: { select: { articles: { where: publishedWhere(locale, new Date()) } } },
    },
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });

  return rows
    .filter((row) => row._count.articles > 0)
    .map((row) => ({ ...localizedName(row, locale), count: row._count.articles }));
}
