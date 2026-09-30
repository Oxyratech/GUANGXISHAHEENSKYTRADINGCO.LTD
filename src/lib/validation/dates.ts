import { MAX_DELIVERY_YEARS } from "./limits";

/** A calendar date as the <input type="date"> value and the API carry it: "YYYY-MM-DD". */
export type IsoDate = string;

/** The dates a required delivery date may fall on, both ends included. */
export interface DateWindow {
  earliest: IsoDate;
  latest: IsoDate;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number, width = 2) => String(value).padStart(width, "0");

function formatIsoDate(year: number, month: number, day: number): IsoDate {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** True for a real calendar date ("2026-02-30" is not one). */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** The same calendar day `years` years on; 29 February becomes 28 February in a common year. */
export function addYears(date: IsoDate, years: number): IsoDate {
  const [year, month, day] = date.split("-").map(Number);
  const target = year + years;
  const lastDay = new Date(Date.UTC(target, month, 0)).getUTCDate();
  return formatIsoDate(target, month, Math.min(day, lastDay));
}

function utcIsoDate(instant: number): IsoDate {
  const date = new Date(instant);
  return formatIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** The window that starts on `today` and ends three years later. */
export function deliveryWindowFrom(today: IsoDate): DateWindow {
  return { earliest: today, latest: addYears(today, MAX_DELIVERY_YEARS) };
}

/** "Today or later, within three years", by the visitor's own calendar. Used in the browser. */
export function localDeliveryWindow(now: Date = new Date()): DateWindow {
  return deliveryWindowFrom(formatIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate()));
}

/**
 * The same rule as the server can apply it. The server does not know the visitor's time zone, and
 * at one instant the date is anywhere from a day behind to a day ahead of the UTC date, so both
 * ends get a day of grace rather than turning away someone whose "today" differs from UTC's.
 */
export function serverDeliveryWindow(now: Date = new Date()): DateWindow {
  return {
    earliest: utcIsoDate(now.getTime() - DAY_MS),
    latest: addYears(utcIsoDate(now.getTime() + DAY_MS), MAX_DELIVERY_YEARS),
  };
}
