import { ROLE_DEFINITIONS } from "@/server/auth/permissions";

/*
 * Display formatting shared by every admin page. Pure and free of `server-only`, so client components
 * can use it too. Nothing here reads the locale or the time zone of the machine: the server render
 * and the browser produce identical text, which keeps hydration quiet and makes timestamps unambiguous.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** What an absent or unreadable value renders as. */
export const EMPTY_VALUE = "—";

export type DateInput = Date | string | number | null | undefined;

export function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const two = (n: number) => String(n).padStart(2, "0");

/**
 * "18 Jun 2026, 14:05 UTC" (or "18 Jun 2026" with `dateOnly`). The database stores UTC, and the label
 * is part of the text so a reader in any time zone knows what they are looking at.
 */
export function formatUtc(value: DateInput, options: { dateOnly?: boolean } = {}): string {
  const date = toValidDate(value);
  if (!date) return EMPTY_VALUE;

  const day = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  if (options.dateOnly) return day;
  return `${day}, ${two(date.getUTCHours())}:${two(date.getUTCMinutes())} UTC`;
}

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

/** "1.5 MB". Binary steps (1024) with the familiar unit names. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return EMPTY_VALUE;
  }
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < BYTE_UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || size >= 100 ? 0 : 1;
  return `${size.toFixed(digits)} ${BYTE_UNITS[unit]}`;
}

/** Shortens text to at most `max` characters, ending with an ellipsis when it was cut. */
export function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  let end = Math.max(0, max - 1);
  // Never cut through the middle of a surrogate pair (emoji, rare CJK).
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return `${text.slice(0, end).trimEnd()}…`;
}

let regionNames: Intl.DisplayNames | undefined;

/**
 * "CN" -> "China". Free-text country names (the inquiry form stores what the buyer typed) pass
 * through untouched, and an unknown code is shown as the upper-cased code.
 */
export function formatCountryCode(code: string | null | undefined): string {
  const value = code?.trim();
  if (!value) return EMPTY_VALUE;
  if (!/^[A-Za-z]{2}$/.test(value)) return value;

  const upper = value.toUpperCase();
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    const name = regionNames.of(upper);
    return name && name !== upper && name !== "Unknown Region" ? name : upper;
  } catch {
    return upper;
  }
}

/** "IN_PROGRESS" -> "In progress". Fallback label for a status the code base has no label for. */
export function humanizeCode(code: string): string {
  const words = code.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "SALES_MANAGER" -> "Sales / Inquiry Manager": the role's display name, or a readable fallback. */
export function formatRoleName(key: string): string {
  return ROLE_DEFINITIONS.find((role) => role.key === key)?.name ?? humanizeCode(key);
}
