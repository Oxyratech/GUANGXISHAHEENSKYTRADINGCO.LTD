import { z } from "zod";

/**
 * Registry of the SiteSetting keys the application knows about, with the schema each value must
 * satisfy. This file has no server-only imports on purpose: the admin form can reuse the same
 * schemas for client-side feedback. The server (settings.ts) is still the authority.
 *
 * `isPublic` decides whether the row may be read by public pages. Only keys that are safe to print
 * on the website may set it; anything else stays out of every public reader.
 */

/** Strips the spaces, dots, dashes and brackets people type inside a number. */
export function toDialString(value: string): string {
  return value.replace(/[\s().-]/g, "");
}

const NUMBER_CHARACTERS = /^\+[\d\s().-]+$/;
const E164 = /^\+[1-9]\d{6,14}$/;

/** True for an international-format number: "+", a country code and 7 to 15 digits in total. */
export function isInternationalNumber(value: string): boolean {
  return NUMBER_CHARACTERS.test(value) && E164.test(toDialString(value));
}

const email = z
  .string()
  .trim()
  .max(254, "invalid_email")
  .pipe(z.email({ error: "invalid_email" }));

/** Kept as typed (so it prints the way the company writes it), with runs of spaces collapsed. */
const internationalNumber = (code: string) =>
  z
    .string()
    .trim()
    .max(40, code)
    .refine(isInternationalNumber, { error: code })
    .transform((value) => value.replace(/\s+/g, " "));

export const SETTING_KEYS = {
  "contact.email": { schema: email, isPublic: true },
  "contact.phone": { schema: internationalNumber("invalid_phone"), isPublic: true },
  "contact.whatsapp": { schema: internationalNumber("invalid_whatsapp"), isPublic: true },
} as const;

export type SettingKey = keyof typeof SETTING_KEYS;

export function isSettingKey(value: string): value is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTING_KEYS, value);
}

/**
 * Validates one stored or submitted value. Returns the normalised value, or the first error code
 * ("invalid_email", "invalid_phone", "invalid_whatsapp").
 */
export function parseSetting(
  key: SettingKey,
  raw: unknown,
): { ok: true; value: string } | { ok: false; code: string } {
  const result = SETTING_KEYS[key].schema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, code: result.error.issues[0]?.message ?? "invalid" };
}
