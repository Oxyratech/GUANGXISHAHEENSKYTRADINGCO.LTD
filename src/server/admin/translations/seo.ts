import "server-only";
import { LOCALES, type Locale } from "@/i18n/locales";
import type { SeoScope } from "@/lib/domain/statuses";
import { getDb, toDatabaseError } from "@/server/db";

export interface SeoOverrideCoverage {
  scope: SeoScope;
  refKey: string;
  locales: Locale[];
  missingLocales: Locale[];
}

/**
 * Every existing SEO override target, grouped by (scope, refKey), with which locales already carry a
 * row. A NEWS target's own locale is fixed by its article (see @/server/admin/seo/queries), so
 * "missing" there just means the other two locales have no override of their own — not that anything
 * is wrong.
 */
export async function computeSeoOverrideCoverage(): Promise<SeoOverrideCoverage[]> {
  try {
    const rows = await getDb().seoMetadata.findMany({ select: { scope: true, refKey: true, locale: true } });
    const groups = new Map<string, { scope: string; refKey: string; locales: Set<string> }>();
    for (const row of rows) {
      const key = `${row.scope}:${row.refKey}`;
      const entry = groups.get(key) ?? { scope: row.scope, refKey: row.refKey, locales: new Set<string>() };
      entry.locales.add(row.locale);
      groups.set(key, entry);
    }
    return [...groups.values()].map((entry) => {
      const locales = LOCALES.filter((locale) => entry.locales.has(locale));
      return {
        scope: entry.scope as SeoScope,
        refKey: entry.refKey,
        locales,
        missingLocales: LOCALES.filter((locale) => !locales.includes(locale)),
      };
    });
  } catch (error) {
    throw toDatabaseError(error);
  }
}
