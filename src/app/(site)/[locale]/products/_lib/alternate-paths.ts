import { LOCALES, type Locale } from "@/i18n/locales";

/**
 * Where a product page can be reached in each language, for the language switcher. A product with
 * no translation for a language is still shown there (in English), unless it has no English text
 * either; then the switcher goes to the category page rather than to a 404.
 */
export function productPathsForSwitcher(
  translatedLocales: readonly Locale[],
  productPath: string,
  categoryPath: string,
): Record<Locale, string> {
  const hasEnglish = translatedLocales.includes("en");
  return Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      hasEnglish || translatedLocales.includes(locale) ? productPath : categoryPath,
    ]),
  ) as Record<Locale, string>;
}

/**
 * hreflang alternates: only languages with a real translation, so search engines are never told a
 * translated page exists where the text would be English.
 */
export function productPathsForHreflang(
  translatedLocales: readonly Locale[],
  productPath: string,
): Partial<Record<Locale, string>> {
  return Object.fromEntries(translatedLocales.map((locale) => [locale, productPath]));
}
