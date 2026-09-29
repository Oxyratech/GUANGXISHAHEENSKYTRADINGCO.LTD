// Deliberately free of `import "server-only"` and of any project import: the seed and the
// create-admin CLI run under tsx, where `server-only` throws. Node built-ins only.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * scrypt with N=2^16, r=8, p=2 (64 MiB per hash), one of the OWASP-recommended cost settings.
 * The parameters are stored in the hash, so raising them later still verifies old hashes.
 * Format: scrypt$N$r$p$salt$hash (salt and hash base64url).
 */
const SCRYPT_N = 2 ** 16;
const SCRYPT_R = 8;
const SCRYPT_P = 2;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

// Bounds applied when parsing a stored hash, so a corrupted row cannot request absurd memory/time.
const MAX_N = 2 ** 20;
const MAX_R = 16;
const MAX_P = 16;

/** scrypt working set (128·r·(N+p+2) bytes) plus headroom; Node aborts if this is too small. */
function memoryLimit(n: number, r: number, p: number): number {
  return 128 * r * (n + p + 2) + 1024 * 1024;
}

interface ScryptParams {
  n: number;
  r: number;
  p: number;
}

function deriveKey(password: string, salt: Buffer, keyBytes: number, params: ScryptParams) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      keyBytes,
      { N: params.n, r: params.r, p: params.p, maxmem: memoryLimit(params.n, params.r, params.p) },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(plain, salt, KEY_BYTES, { n: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

interface ParsedHash extends ScryptParams {
  salt: Buffer;
  key: Buffer;
}

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;

  const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const isPowerOfTwo = Number.isInteger(n) && n >= 2 ** 14 && n <= MAX_N && (n & (n - 1)) === 0;
  if (!isPowerOfTwo) return null;
  if (!Number.isInteger(r) || r < 1 || r > MAX_R) return null;
  if (!Number.isInteger(p) || p < 1 || p > MAX_P) return null;

  const salt = Buffer.from(parts[4], "base64url");
  const key = Buffer.from(parts[5], "base64url");
  if (salt.length < 8 || key.length < 16 || key.length > 128) return null;

  return { n, r, p, salt, key };
}

// Inputs longer than this are never real passwords (strength validation caps at 128).
const MAX_VERIFY_LENGTH = 1024;
const dummySalt = randomBytes(SALT_BYTES);

/**
 * Spends the same CPU/memory as a real verification. Call it when the account does not exist (or is
 * unusable) so response time does not reveal which emails are registered. Always resolves false.
 */
export async function verifyPasswordDummy(): Promise<false> {
  await deriveKey("dummy-password", dummySalt, KEY_BYTES, {
    n: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return false;
}

/** Constant-time check of `plain` against a stored hash. Malformed hashes never verify. */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed || plain.length > MAX_VERIFY_LENGTH) return verifyPasswordDummy();

  const derived = await deriveKey(plain, parsed.salt, parsed.key.length, parsed);
  return derived.length === parsed.key.length && timingSafeEqual(derived, parsed.key);
}

const MIN_LENGTH = 12;
const MAX_LENGTH = 128;

// Compared after lower-casing and stripping everything except letters and digits.
const COMMON_PASSWORDS = new Set([
  "password1234",
  "password12345",
  "passw0rd1234",
  "123456789012",
  "1234567890123",
  "qwertyuiop12",
  "qwertyuiop123",
  "qwerty123456",
  "iloveyou1234",
  "letmein12345",
  "welcome12345",
  "administrator",
  "administrator1",
  "adminadminadmin",
  "changemechangeme",
  "abcdefghijkl",
  "abcd12345678",
]);
const COMMON_FRAGMENTS = ["password", "qwertyuiop", "123456789", "letmein"];

export type PasswordStrength = { ok: true } | { ok: false; reason: string };

function characterClasses(value: string): number {
  // Lo covers scripts without letter case (Arabic, Chinese, ...), which count as their own class.
  return [/\p{Ll}/u, /\p{Lu}/u, /\p{Lo}/u, /\p{Nd}/u, /[^\p{L}\p{Nd}]/u].filter((re) =>
    re.test(value),
  ).length;
}

/**
 * Length matters more than composition (NIST 800-63B), so the rules are few: 12–128 characters,
 * more than one character class, not an obvious password, not derived from the account email.
 */
export function validatePasswordStrength(plain: string, email?: string): PasswordStrength {
  const value = plain.normalize("NFKC");
  const length = Array.from(value).length;

  if (length < MIN_LENGTH)
    return { ok: false, reason: `Password must be at least ${MIN_LENGTH} characters.` };
  if (length > MAX_LENGTH)
    return { ok: false, reason: `Password must be at most ${MAX_LENGTH} characters.` };
  if (characterClasses(value) < 2) {
    return {
      ok: false,
      reason: "Password must mix at least two kinds of character (letters, digits, symbols).",
    };
  }

  const comparable = value.toLowerCase().replace(/[^\p{L}\p{Nd}]/gu, "");
  if (
    COMMON_PASSWORDS.has(comparable) ||
    COMMON_FRAGMENTS.some((fragment) => comparable.includes(fragment))
  ) {
    return { ok: false, reason: "Password is too common. Choose something less predictable." };
  }
  if (new Set(comparable).size < 5) {
    return { ok: false, reason: "Password is too repetitive." };
  }

  const localPart = email
    ?.split("@")[0]
    ?.trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{Nd}]/gu, "");
  if (localPart && localPart.length >= 3 && comparable.includes(localPart)) {
    return { ok: false, reason: "Password must not contain your email name." };
  }

  return { ok: true };
}
