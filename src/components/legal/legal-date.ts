import { formatCalendarDate } from "@/lib/format-date";
import type { Locale } from "@/i18n/locales";

/**
 * "30 September 2026", "2026年9月30日", "30 سبتمبر 2026". The date is a calendar date, so it is read
 * and formatted in UTC (no timezone can shift it), and digits stay Latin in Arabic to match the
 * rest of the site.
 */
export function formatLegalDate(iso: string, locale: Locale): string {
  return formatCalendarDate(iso, locale);
}
