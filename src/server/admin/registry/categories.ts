import "server-only";
import { getScopeItemsByGroup, SCOPE_SUFFIX_ZH } from "@/config/business-scope";
import { CATEGORIES, type CategorySlug } from "@/content/categories";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/load-messages";
import { countPublishedByCategory } from "@/server/products";
import type { DatabaseUnavailableCause } from "@/server/db/errors";

/*
 * Read-only registry of the 12 product categories, for the admin's "managed in code" list (see
 * docs/ARCHITECTURE.md §4 and src/content/categories.ts). Nothing here is written by the admin; the
 * only variable part is the published-product count, which comes from the database and degrades
 * honestly when it is unavailable, exactly like the public site.
 */

export interface CategoryRegistryRow {
  slug: CategorySlug;
  name: string;
  regulated: boolean;
  scopeItemCount: number;
  /** Verbatim license wording (§9's business-scope items) backing this category, in license order. */
  scopeItemsZh: string[];
  /** Qualifier that applies to the whole registered scope, shown once alongside the items. */
  scopeSuffixZh: string;
  /** `null` while the database cannot be reached; the page shows that honestly instead of a zero. */
  publishedCount: number | null;
  publicPaths: Record<Locale, string>;
}

export interface CategoryRegistryResult {
  rows: CategoryRegistryRow[];
  databaseUnavailable: DatabaseUnavailableCause | null;
}

function publicPathsFor(slug: string): Record<Locale, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, `/${locale}/products/${slug}`]),
  ) as Record<Locale, string>;
}

export async function listCategoryRegistry(): Promise<CategoryRegistryResult> {
  const [messages, counts] = await Promise.all([
    loadMessages(DEFAULT_LOCALE),
    countPublishedByCategory(DEFAULT_LOCALE),
  ]);
  const databaseUnavailable = counts.ok ? null : counts.cause;

  const rows = CATEGORIES.map((category): CategoryRegistryRow => {
    const scopeItems = getScopeItemsByGroup(category.slug);
    return {
      slug: category.slug,
      name: messages.categories[category.slug].name,
      regulated: category.regulated,
      scopeItemCount: scopeItems.length,
      scopeItemsZh: scopeItems.map((item) => item.zh),
      scopeSuffixZh: SCOPE_SUFFIX_ZH,
      publishedCount: counts.ok ? (counts.data[category.slug] ?? 0) : null,
      publicPaths: publicPathsFor(category.slug),
    };
  });

  return { rows, databaseUnavailable };
}
