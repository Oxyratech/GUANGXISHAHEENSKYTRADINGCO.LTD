import "server-only";
import { getScopeItem } from "@/config/business-scope";
import { SERVICES, type ServiceSlug } from "@/content/services";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/load-messages";

/*
 * Read-only registry of the 6 service pages (src/content/services.ts). Entirely code-defined, so this
 * has no database dependency and cannot go "unavailable" the way the categories registry can.
 */

export interface ServiceRegistryRow {
  slug: ServiceSlug;
  name: string;
  /** The registered business-scope items (verbatim license text) this service line relates to. */
  relatedScopeItemsZh: string[];
  publicPaths: Record<Locale, string>;
}

function publicPathsFor(slug: string): Record<Locale, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, `/${locale}/business/${slug}`]),
  ) as Record<Locale, string>;
}

export async function listServiceRegistry(): Promise<ServiceRegistryRow[]> {
  const messages = await loadMessages(DEFAULT_LOCALE);
  return SERVICES.map((service) => ({
    slug: service.slug,
    name: messages.services[service.slug].name,
    relatedScopeItemsZh: service.scopeItemIds.flatMap((itemId) => {
      const item = getScopeItem(itemId);
      return item ? [item.zh] : [];
    }),
    publicPaths: publicPathsFor(service.slug),
  }));
}
