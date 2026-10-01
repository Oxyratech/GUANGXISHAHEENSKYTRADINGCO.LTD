import { formatCalendarDate } from "@/lib/format-date";
import type { Locale } from "@/i18n/locales";

/** "2026-06-18" as a long date in the reader's language. Read as UTC so no time zone shifts the day. */
export function formatLongDate(isoDate: string, locale: Locale): string {
  return formatCalendarDate(isoDate, locale);
}
