import "server-only";
import { normalizeEmail } from "@/server/auth/email";
import { getRequestContext } from "@/server/http/request-context";
import { hmacHex, randomToken, timingSafeEqualString } from "./hash";
import { RATE_LIMITS, rateLimit, rateLimitKey } from "./rate-limit";

/** Hidden text input that humans never see or fill; bots that autofill every field do. */
export const HONEYPOT_FIELD = "website_url";
/** Hidden input carrying the value of createFormToken(). */
export const FORM_TOKEN_FIELD = "form_token";

const DEFAULT_MIN_SECONDS = 3;
const DEFAULT_MAX_SECONDS = 2 * 60 * 60;

function signature(issuedAt: string, nonce: string): string {
  return hmacHex(`form:${issuedAt}.${nonce}`);
}

/**
 * Signed, timestamped token to embed in a form when it is rendered. It proves the form was served
 * by us, recently, and (with the minimum age) that it was not submitted faster than a person can
 * type. It is stateless: it is not single-use, so replays are bounded by rate limiting instead.
 *
 * Create it per request (dynamic render, or fetched on mount). A token baked into statically
 * generated HTML would carry the build time and expire.
 */
export function createFormToken(): string {
  const issuedAt = String(Math.floor(Date.now() / 1000));
  const nonce = randomToken(9);
  return `${issuedAt}.${nonce}.${signature(issuedAt, nonce)}`;
}

export type FormTokenResult =
  { ok: true } | { ok: false; reason: "missing" | "invalid" | "too_fast" | "expired" };

export function verifyFormToken(
  token: string | null | undefined,
  opts: { minSeconds?: number; maxSeconds?: number } = {},
): FormTokenResult {
  const { minSeconds = DEFAULT_MIN_SECONDS, maxSeconds = DEFAULT_MAX_SECONDS } = opts;
  if (!token) return { ok: false, reason: "missing" };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "invalid" };
  const [issuedAt, nonce, provided] = parts;

  if (!/^\d{1,12}$/.test(issuedAt) || !nonce || !provided) return { ok: false, reason: "invalid" };
  if (!timingSafeEqualString(signature(issuedAt, nonce), provided))
    return { ok: false, reason: "invalid" };

  const ageSeconds = Date.now() / 1000 - Number(issuedAt);
  if (ageSeconds < minSeconds) return { ok: false, reason: "too_fast" };
  if (ageSeconds > maxSeconds) return { ok: false, reason: "expired" };
  return { ok: true };
}

/** True for any non-blank value: real users cannot see the field, so anything in it is a bot. */
export function isHoneypotTripped(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export type GuardResult =
  | { ok: true }
  | {
      ok: false;
      code: "spam" | "rate_limited" | "too_fast" | "expired";
      retryAfterSeconds?: number;
    };

function retryAfter(resetAt: Date): number {
  return Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
}

/**
 * Runs the public-form checks in the order that spends the least: honeypot, signed token, then
 * rate limits per IP hash and (when given) per email hash.
 *
 * - `spam`: honeypot filled. Answer as if it succeeded and store nothing, so bots learn nothing.
 * - `too_fast` / `expired`: show the visitor a "please retry / reload the page" message. A missing
 *   or forged token is reported as `expired` on purpose: a genuine visitor with a stale page (or
 *   after a secret rotation) must get an actionable error, not a silent drop.
 * - `rate_limited`: show a "try again later" message; `retryAfterSeconds` says when.
 *
 * The rate-limit scope is the form's own preset (inquiry, contact) so the two forms do not share a budget.
 */
export async function guardPublicSubmission(args: {
  formData: FormData;
  scope: "inquiry" | "contact";
  email?: string;
}): Promise<GuardResult> {
  const { formData, scope, email } = args;

  if (isHoneypotTripped(formData.get(HONEYPOT_FIELD))) return { ok: false, code: "spam" };

  const tokenValue = formData.get(FORM_TOKEN_FIELD);
  const token = verifyFormToken(typeof tokenValue === "string" ? tokenValue : null);
  if (!token.ok) {
    return { ok: false, code: token.reason === "too_fast" ? "too_fast" : "expired" };
  }

  const preset = RATE_LIMITS[scope];
  const { ipHash } = await getRequestContext();

  const byIp = await rateLimit({ key: rateLimitKey(`${scope}:ip`, ipHash), ...preset });
  if (!byIp.allowed)
    return { ok: false, code: "rate_limited", retryAfterSeconds: retryAfter(byIp.resetAt) };

  const normalisedEmail = email ? normalizeEmail(email) : undefined;
  if (normalisedEmail) {
    const byEmail = await rateLimit({
      key: rateLimitKey(`${scope}:email`, normalisedEmail),
      ...preset,
    });
    if (!byEmail.allowed) {
      return { ok: false, code: "rate_limited", retryAfterSeconds: retryAfter(byEmail.resetAt) };
    }
  }

  return { ok: true };
}
