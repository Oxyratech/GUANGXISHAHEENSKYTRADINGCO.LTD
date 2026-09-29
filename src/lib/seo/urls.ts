import { getSiteUrl } from "@/config/site";
import { DEFAULT_LOCALE, LOCALE_META, LOCALES, type Locale } from "@/i18n/locales";

/** hreflang value -> absolute URL. Always carries an `x-default` entry. */
export type LanguageAlternates = Record<string, string>;

/** Locale -> pathname (locale prefix excluded) for content that exists in only some locales. */
export type PathsByLocale = Partial<Record<Locale, string>>;

/** "about/", "/about?x=1#y" -> "/about"; "" -> "/". */
function normalizePath(path: string): string {
  const withoutQuery = path.split(/[?#]/, 1)[0] ?? "";
  const collapsed = `/${withoutQuery}`.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : "/";
}

export function isHomePath(path: string): boolean {
  return normalizePath(path) === "/";
}

/** Absolute URL for a site-level pathname such as "/sitemap.xml". Honours a base path in the site URL. */
export function absoluteUrl(path: string): string {
  const site = getSiteUrl();
  const basePath = site.pathname.replace(/\/+$/, "");
  return `${site.origin}${basePath}${normalizePath(path)}`;
}

/** "/about" in `ar` -> "/ar/about". The home page is "/ar" (no trailing slash). */
export function localizedPath(locale: Locale, path: string): string {
  const normalized = normalizePath(path);
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

export function localizedUrl(locale: Locale, path: string): string {
  return absoluteUrl(localizedPath(locale, path));
}

/**
 * hreflang alternates for content whose pathname differs per locale (news is authored per language)
 * or that exists in only some locales. `x-default` is the default-locale page, or the first
 * available one when the default locale has none.
 */
export function alternatesForPaths(paths: PathsByLocale): LanguageAlternates {
  const available = LOCALES.flatMap((locale) => {
    const path = paths[locale];
    return path === undefined ? [] : [{ locale, url: localizedUrl(locale, path) }];
  });

  const languages: LanguageAlternates = {};
  for (const { locale, url } of available) languages[LOCALE_META[locale].hreflang] = url;
  const fallback = available.find((entry) => entry.locale === DEFAULT_LOCALE) ?? available[0];
  if (fallback) languages["x-default"] = fallback.url;
  return languages;
}

/** hreflang alternates for a page that exists in every locale under the same pathname. */
export function alternatesFor(path: string): LanguageAlternates {
  return alternatesForPaths(Object.fromEntries(LOCALES.map((locale) => [locale, path])));
}
