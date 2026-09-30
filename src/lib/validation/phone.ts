import { PHONE_DIGITS } from "./limits";

const INTERNATIONAL_PREFIX = /^(?:\+|00)/;
/** Digits, spaces and the punctuation people put in numbers. */
const NUMBER_CHARACTERS = /^[\d\s().-]+$/;

/**
 * Lenient international phone check: only number characters (after an optional "+" or "00"
 * prefix) and between 6 and 15 digits. It does not try to know every country's numbering plan,
 * which would reject real customers; it catches typos, letters and pasted sentences. The empty
 * string is not a number: callers treat it as "not given".
 */
export function isPlausiblePhone(value: string): boolean {
  const number = value.replace(INTERNATIONAL_PREFIX, "");
  if (!NUMBER_CHARACTERS.test(number)) return false;
  const digits = number.replace(/\D/g, "").length;
  return digits >= PHONE_DIGITS.min && digits <= PHONE_DIGITS.max;
}
