import type { MetadataRoute } from "next";
import { STATIC_PUBLIC_PATHS } from "@/config/routes";
import { CATEGORY_SLUGS } from "@/content/categories";
import { LOCALES } from "@/i18n/locales";
import { alternatesFor, localizedUrl } from "./urls";

/**
 * Every static public page and every product category page, in every locale, each carrying the full
 * hreflang set. No `lastModified`: these pages come from code, not from records with a real
 * modification date, and a made-up date would be a false freshness signal.
 */
export function buildStaticSitemapEntries(): MetadataRoute.Sitemap {
  const paths: readonly string[] = [
    ...STATIC_PUBLIC_PATHS,
    ...CATEGORY_SLUGS.map((slug) => `/products/${slug}`),
  ];

  return paths.flatMap((path) => {
    const languages = alternatesFor(path);
    return LOCALES.map((locale) => ({
      url: localizedUrl(locale, path),
      alternates: { languages },
    }));
  });
}
