import "server-only";
import { sha256Hex } from "@/server/security/hash";

/** A session ends after this long without use (sliding)... */
export const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
/** ...and never lives longer than this, however active it is. */
export const ABSOLUTE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
/** lastUsedAt is refreshed at most this often, so reads do not become writes. */
export const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** The database only ever sees this hash; the raw token exists in the browser cookie alone. */
export function hashSessionToken(token: string): string {
  return sha256Hex(token);
}

export type SessionEvaluation =
  { state: "valid"; shouldTouch: boolean } | { state: "expired" | "idle_expired" };

export function evaluateSession(input: {
  now: Date;
  expiresAt: Date;
  lastUsedAt: Date;
}): SessionEvaluation {
  const now = input.now.getTime();
  if (now >= input.expiresAt.getTime()) return { state: "expired" };
  if (now - input.lastUsedAt.getTime() >= IDLE_TIMEOUT_MS) return { state: "idle_expired" };
  return { state: "valid", shouldTouch: now - input.lastUsedAt.getTime() >= TOUCH_INTERVAL_MS };
}
