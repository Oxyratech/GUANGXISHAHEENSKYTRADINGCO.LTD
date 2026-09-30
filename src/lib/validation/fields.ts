import { z } from "zod";
import { isCountryCode } from "@/lib/countries";
import { isIsoDate, type DateWindow } from "./dates";
import { FIELD_LIMITS, MAX_DELIVERY_YEARS, PHONE_DIGITS } from "./limits";
import { messageKey } from "./message-key";
import { isPlausiblePhone } from "./phone";
import { cleanLine, cleanMultiline, toAsciiDigits } from "./text";

/*
 * Field builders shared by the inquiry and contact schemas. Every message is a key (see
 * message-key.ts). "Optional" fields accept a missing value and an empty string and come out as ""
 * (the persistence layer stores "" as NULL), so the same schema serves react-hook-form, which
 * always submits strings, and FormData, which omits untouched fields.
 */

const required = messageKey("validation.required");
const invalid = messageKey("validation.invalid");
const tooShort = (min: number) => messageKey("validation.tooShort", { min });
const tooLong = (max: number) => messageKey("validation.tooLong", { max });

interface Size {
  readonly min?: number;
  readonly max: number;
}

export function requiredLine({ min = 1, max }: Size) {
  const field = z.string({ error: required }).overwrite(cleanLine).min(1, required);
  return (min > 1 ? field.min(min, tooShort(min)) : field).max(max, tooLong(max));
}

export function requiredMultiline({ min = 1, max }: Size) {
  const field = z.string({ error: required }).overwrite(cleanMultiline).min(1, required);
  return (min > 1 ? field.min(min, tooShort(min)) : field).max(max, tooLong(max));
}

export function optionalLine({ max }: Size) {
  return z.string({ error: invalid }).overwrite(cleanLine).max(max, tooLong(max)).default("");
}

export function optionalMultiline({ max }: Size) {
  return z.string({ error: invalid }).overwrite(cleanMultiline).max(max, tooLong(max)).default("");
}

export const emailField = z
  .string({ error: required })
  .overwrite((value) => cleanLine(value).toLowerCase())
  .min(1, required)
  .max(FIELD_LIMITS.email.max, tooLong(FIELD_LIMITS.email.max))
  .check(z.email({ error: messageKey("validation.email") }));

export const phoneField = z
  .string({ error: invalid })
  .overwrite((value) => toAsciiDigits(cleanLine(value)))
  .max(FIELD_LIMITS.phone.max, tooLong(FIELD_LIMITS.phone.max))
  .refine((value) => value === "" || isPlausiblePhone(value), {
    error: messageKey("validation.phone", PHONE_DIGITS),
  })
  .default("");

const upperCase = (value: string) => cleanLine(value).toUpperCase();
const invalidCountry = messageKey("validation.invalidCountry");

export const requiredCountryField = z
  .string({ error: required })
  .overwrite(upperCase)
  .min(1, required)
  .refine(isCountryCode, { error: invalidCountry });

export const optionalCountryField = z
  .string({ error: invalid })
  .overwrite(upperCase)
  .refine((value) => value === "" || isCountryCode(value), { error: invalidCountry })
  .default("");

/** "" (not given) or one of `allowed`. */
export function optionalChoiceField(isAllowed: (value: string) => boolean) {
  return z
    .string({ error: invalid })
    .overwrite(cleanLine)
    .refine((value) => value === "" || isAllowed(value), {
      error: messageKey("validation.invalidChoice"),
    })
    .default("");
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSlug(value: string): boolean {
  return SLUG.test(value);
}

export const optionalSlugField = z
  .string({ error: invalid })
  .overwrite(cleanLine)
  .max(FIELD_LIMITS.productSlug.max, tooLong(FIELD_LIMITS.productSlug.max))
  .refine((value) => value === "" || isSlug(value), { error: invalid })
  .default("");

/** A calendar date inside `window`, or "". */
export function optionalDateField(window: DateWindow) {
  const isDate = (value: string) => isIsoDate(value);
  return z
    .string({ error: invalid })
    .overwrite(cleanLine)
    .refine((value) => value === "" || isDate(value), {
      error: messageKey("validation.dateInvalid"),
    })
    .refine((value) => value === "" || !isDate(value) || value >= window.earliest, {
      error: messageKey("validation.dateInPast"),
    })
    .refine((value) => value === "" || !isDate(value) || value <= window.latest, {
      error: messageKey("validation.dateTooFar", { years: MAX_DELIVERY_YEARS }),
    })
    .default("");
}

export const consentField = z
  .boolean({ error: messageKey("validation.consentRequired") })
  .refine((value) => value === true, { error: messageKey("validation.consentRequired") });
