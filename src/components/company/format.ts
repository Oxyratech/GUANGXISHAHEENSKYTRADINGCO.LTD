import { COMPANY } from "@/config/company";
import { formatCalendarDate } from "@/lib/format-date";
import type { Locale } from "@/i18n/locales";

/** Currency label as used in trade documents; the license itself writes 人民币 (renminbi). */
const CURRENCY_LABELS = { CNY: "RMB" } as const;

const AMOUNT_FORMAT = new Intl.NumberFormat("en-US");

/** "2026-06-18" as a long date in the reader's language. Read as UTC so no time zone shifts the day. */
export function formatLongDate(isoDate: string, locale: Locale): string {
  return formatCalendarDate(isoDate, locale);
}

/** "RMB 50,000": currency label and digits are the same in every language. */
export function formatRegisteredCapital(): string {
  const { amount, currency } = COMPANY.registeredCapital;
  return `${CURRENCY_LABELS[currency]} ${AMOUNT_FORMAT.format(amount)}`;
}
