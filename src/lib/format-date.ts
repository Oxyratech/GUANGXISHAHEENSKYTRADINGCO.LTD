import { LOCALE_META, type Locale } from "@/i18n/locales";

/**
 * A calendar date (no time-of-day) written as a long date in the reader's language: "June 18, 2026",
 * "2026年6月18日", "30 سبتمبر 2026". Read and formatted in UTC so no time zone can shift the day, and
 * Arabic keeps Latin digits to match the codes, capital and counts shown beside it. Used for the
 * company's founding date and legal-document dates, which are calendar dates, not moments in time —
 * a published article has an actual instant and its own time-zone-aware formatter.
 */
export function formatCalendarDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(`${LOCALE_META[locale].htmlLang}-u-nu-latn`, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
