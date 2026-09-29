import "server-only";
import { logger } from "@/lib/logger";
import { writeAudit } from "@/server/audit";
import { getDb, toDatabaseError } from "@/server/db";
import { hmacHex } from "@/server/security/hash";
import { verifyPassword, verifyPasswordDummy } from "@/server/security/password";
import { RATE_LIMITS, rateLimit, rateLimitKey } from "@/server/security/rate-limit";
import { normalizeEmail } from "./email";

export interface AuthenticateInput {
  email: string;
  password: string;
  ctx: { ipHash: string; userAgent: string | null };
}

export type AuthenticateResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid_credentials" | "locked" | "rate_limited" };

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const INVALID: AuthenticateResult = { ok: false, reason: "invalid_credentials" };

/**
 * Checks an email/password pair. It does not start a session; on `ok` the caller calls createSession.
 *
 * What the caller may tell the visitor is deliberately narrow. Unknown email, wrong password and a
 * deactivated account all come back as `invalid_credentials`, and each of them costs the same
 * scrypt work, so neither the message nor the response time says whether an email is registered.
 * The precise cause goes to the server log only. `locked` is reported once an account has
 * actually been locked, which does reveal that the account exists; see docs/SECURITY.md.
 */
export async function authenticate(input: AuthenticateInput): Promise<AuthenticateResult> {
  try {
    return await run(input);
  } catch (error) {
    throw toDatabaseError(error);
  }
}

async function run({ email, password, ctx }: AuthenticateInput): Promise<AuthenticateResult> {
  const normalised = normalizeEmail(email);
  // Sequential on purpose: an already-blocked IP must not keep draining the victim's email budget.
  const byIp = await rateLimit({ key: rateLimitKey("login:ip", ctx.ipHash), ...RATE_LIMITS.login });
  const byEmail = byIp.allowed
    ? await rateLimit({ key: rateLimitKey("login:email", normalised), ...RATE_LIMITS.login })
    : byIp;
  if (!byIp.allowed || !byEmail.allowed) {
    logger.warn("auth.login_rate_limited", {
      ipHash: ctx.ipHash,
      by: byIp.allowed ? "email" : "ip",
    });
    return { ok: false, reason: "rate_limited" };
  }

  const emailHash = hmacHex(`email:${normalised}`);
  const db = getDb();
  const user = await db.user.findUnique({
    where: { email: normalised },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isActive: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    await verifyPasswordDummy();
    logger.info("auth.login_rejected", { cause: "unknown_user", emailHash });
    return INVALID;
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    await verifyPasswordDummy();
    logger.info("auth.login_rejected", { cause: "account_locked", userId: user.id });
    return { ok: false, reason: "locked" };
  }
  if (!user.isActive) {
    await verifyPasswordDummy();
    logger.info("auth.login_rejected", { cause: "inactive_user", userId: user.id });
    return INVALID;
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    return recordFailure({ userId: user.id, ipHash: ctx.ipHash, now });
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });
  await writeAudit({
    actor: { id: user.id, email: user.email },
    action: "auth.login_succeeded",
    entityType: "user",
    entityId: user.id,
    summary: "Signed in",
    ipHash: ctx.ipHash,
  });
  return { ok: true, userId: user.id };
}

async function recordFailure(args: {
  userId: string;
  ipHash: string;
  now: Date;
}): Promise<AuthenticateResult> {
  const { userId, ipHash, now } = args;
  const db = getDb();

  const { failedLoginCount } = await db.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });

  if (failedLoginCount >= MAX_FAILED_LOGINS) {
    const lockedUntil = new Date(now.getTime() + LOCKOUT_MS);
    // Reset the counter with the lock so that, once it lapses, the user gets a full set of attempts.
    await db.user.update({ where: { id: userId }, data: { lockedUntil, failedLoginCount: 0 } });
    await writeAudit({
      action: "auth.account_locked",
      entityType: "user",
      entityId: userId,
      summary: "Account locked after repeated failed sign-ins",
      metadata: { lockedUntil: lockedUntil.toISOString(), failedAttempts: failedLoginCount },
      ipHash,
    });
    return { ok: false, reason: "locked" };
  }

  await writeAudit({
    action: "auth.login_failed",
    entityType: "user",
    entityId: userId,
    summary: "Failed sign-in",
    metadata: { failedAttempts: failedLoginCount },
    ipHash,
  });
  return INVALID;
}
