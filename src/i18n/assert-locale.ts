import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./locales";

/**
 * Narrows a route `[locale]` param to a supported Locale, or renders the 404 page.
 * Usage in every page/layout:
 *   const locale = assertLocale((await params).locale);
 *   setRequestLocale(locale);
 */
export function assertLocale(value: string): Locale {
  if (!isLocale(value)) notFound();
  return value;
}
