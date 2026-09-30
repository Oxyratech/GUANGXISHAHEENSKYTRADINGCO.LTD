import { LOCALES, type Locale } from "@/i18n/locales";

/*
 * Long date ("September 30, 2026", "2026年9月30日", "30 سبتمبر 2026").
 *  - Gregorian calendar in every language: plain "ar" or region variants such as ar-SA can default
 *    to the Islamic calendar.
 *  - Western digits in every language, like the rest of the site (page numbers, codes).
 *  - Shown in the company's time zone, so the date does not depend on where the server runs; an
 *    article published on a China business day keeps that date.
 */
const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US-u-ca-gregory-nu-latn",
  zh: "zh-CN-u-ca-gregory-nu-latn",
  ar: "ar-u-ca-gregory-nu-latn",
};

const NEWS_TIME_ZONE = "Asia/Shanghai";

const formatters = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "long", timeZone: NEWS_TIME_ZONE }),
  ]),
) as Record<Locale, Intl.DateTimeFormat>;

export function formatArticleDate(value: string | Date, locale: Locale): string {
  return formatters[locale].format(typeof value === "string" ? new Date(value) : value);
}
