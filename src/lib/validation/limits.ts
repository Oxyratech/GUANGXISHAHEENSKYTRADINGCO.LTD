/**
 * Field sizes of the public forms. The maximums are the widths of the matching NVarChar columns in
 * prisma/schema.prisma (limits.test.ts reads the schema and fails when they drift), so a value that
 * passes validation always fits the database. NVarChar counts UTF-16 code units, like `.length`.
 */
export const FIELD_LIMITS = {
  name: { min: 2, max: 120 },
  company: { min: 2, max: 200 },
  email: { max: 254 },
  phone: { max: 40 },
  product: { min: 2, max: 200 },
  productSlug: { max: 120 },
  quantity: { max: 120 },
  specification: { max: 4000 },
  targetPrice: { max: 120 },
  additionalRequirements: { max: 4000 },
  message: { min: 10, max: 4000 },
} as const;

/** Digits a phone or WhatsApp number may hold: the E.164 maximum of 15, and a floor that rules out typos. */
export const PHONE_DIGITS = { min: 6, max: 15 } as const;

/** A required delivery date may be at most this many years ahead. */
export const MAX_DELIVERY_YEARS = 3;
