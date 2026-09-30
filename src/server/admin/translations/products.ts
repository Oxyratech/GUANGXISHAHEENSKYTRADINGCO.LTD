import "server-only";
import { LOCALES, type Locale } from "@/i18n/locales";
import { getDb, toDatabaseError } from "@/server/db";

export interface ProductTranslationCoverage {
  id: string;
  slug: string;
  categorySlug: string;
  locales: Locale[];
  missingLocales: Locale[];
}

/** Every product with which locales it has a translation in — real data only, no sample rows. */
export async function computeProductTranslationCoverage(): Promise<ProductTranslationCoverage[]> {
  try {
    const rows = await getDb().product.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        categorySlug: true,
        translations: { select: { locale: true } },
      },
    });
    return rows.map((row) => {
      const locales = LOCALES.filter((locale) => row.translations.some((t) => t.locale === locale));
      return {
        id: row.id,
        slug: row.slug,
        categorySlug: row.categorySlug,
        locales,
        missingLocales: LOCALES.filter((locale) => !locales.includes(locale)),
      };
    });
  } catch (error) {
    throw toDatabaseError(error);
  }
}
