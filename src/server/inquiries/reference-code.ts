import "server-only";
import { randomInt } from "node:crypto";

/** Crockford base32: digits and letters without I, L, O and U, so a code read aloud or copied by hand survives. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 8;
const MAX_ATTEMPTS = 6;

export type ReferencePrefix = "INQ" | "MSG";

/** "INQ-7K3Q9M2X": 40 random bits, drawn without modulo bias. */
export function generateReferenceCode(prefix: ReferencePrefix): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${code}`;
}

const REFERENCE_CODE = /^(?:INQ|MSG)-[0-9A-HJKMNP-TV-Z]{8}$/;

export function isReferenceCode(value: string): boolean {
  return REFERENCE_CODE.test(value);
}

/** Prisma reports a violated unique index as P2002. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Runs `create` with a fresh reference code until the database accepts one. Codes are random, so a
 * clash is rare, but the unique index is the only thing that can prove a code is free: the insert
 * itself is the check, and a violation means "draw another". `create` must insert nothing else
 * that could raise a unique violation.
 */
export async function createWithReferenceCode<T>(
  prefix: ReferencePrefix,
  create: (referenceCode: string) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await create(generateReferenceCode(prefix));
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= MAX_ATTEMPTS) throw error;
    }
  }
}
