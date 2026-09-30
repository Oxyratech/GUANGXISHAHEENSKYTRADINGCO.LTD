import { getDirection, LOCALE_META, type Locale } from "@/i18n/locales";

/**
 * `lang` and `dir` for text written in another language than the page: a product without an
 * Arabic translation shows its English text inside an Arabic page, and assistive technology,
 * hyphenation and the font stack need to know. Nothing is added when the languages match.
 */
export function contentLanguageProps(
  contentLocale: Locale,
  pageLocale: Locale,
): { lang?: string; dir?: "ltr" | "rtl" } {
  if (contentLocale === pageLocale) return {};
  return { lang: LOCALE_META[contentLocale].htmlLang, dir: getDirection(contentLocale) };
}
