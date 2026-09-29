import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { logger } from "@/lib/logger";
import { getDb, toDatabaseError } from "@/server/db";
import { randomToken } from "@/server/security/hash";
import { isPermission, isRoleKey, type Permission, type RoleKey } from "./permissions";
import { ABSOLUTE_TIMEOUT_MS, evaluateSession, hashSessionToken } from "./session-policy";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * The `__Host-` prefix makes browsers refuse the cookie unless it is Secure, has Path=/ and no
 * Domain, so it cannot be planted from a sibling subdomain. It requires HTTPS, hence production only.
 */
export const SESSION_COOKIE = IS_PRODUCTION ? "__Host-shaheen_session" : "shaheen_session";

export interface AuthSession {
  sessionId: string;
  user: { id: string; email: string; name: string };
  roles: RoleKey[];
  permissions: ReadonlySet<Permission>;
}

interface SessionContext {
  ipHash: string;
  userAgent: string | null;
}

const COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "lax",
  path: "/",
} as const;

/**
 * Starts a session: a fresh 256-bit random token goes to the browser, its SHA-256 goes to the
 * database. A new token is minted on every sign-in (no session fixation), and any session the
 * browser already held is revoked. Call from a Server Action or Route Handler (cookies are
 * read-only while rendering).
 */
export async function createSession(
  userId: string,
  ctx: SessionContext,
): Promise<{ sessionId: string; expiresAt: Date }> {
  try {
    const db = getDb();
    const store = await cookies();
    const now = new Date();

    const previousToken = store.get(SESSION_COOKIE)?.value;
    if (previousToken) {
      await db.session.deleteMany({ where: { tokenHash: hashSessionToken(previousToken) } });
    }
    // Housekeeping: rows past their absolute expiry are dead weight, and this indexed delete is cheap.
    await db.session.deleteMany({ where: { expiresAt: { lt: now } } });

    const token = randomToken(32);
    const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS);
    const created = await db.session.create({
      data: {
        userId,
        tokenHash: hashSessionToken(token),
        expiresAt,
        lastUsedAt: now,
        ipHash: ctx.ipHash,
        userAgent: ctx.userAgent?.slice(0, 255) ?? null,
      },
      select: { id: true },
    });

    // The cookie lives as long as the absolute limit; the idle limit is enforced server-side.
    store.set(SESSION_COOKIE, token, { ...COOKIE_BASE, expires: expiresAt });
    return { sessionId: created.id, expiresAt };
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/** Housekeeping that must never turn a valid request into an error. */
async function bestEffort(event: string, action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error) {
    logger.warn(event, { error });
  }
}

async function loadSession(): Promise<AuthSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 256) return null;

  const db = getDb();
  const row = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      expiresAt: true,
      lastUsedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          lockedUntil: true,
          roles: {
            select: {
              role: {
                select: {
                  key: true,
                  permissions: { select: { permission: { select: { key: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!row) return null;

  const now = new Date();
  const evaluation = evaluateSession({ now, expiresAt: row.expiresAt, lastUsedAt: row.lastUsedAt });
  if (evaluation.state !== "valid") {
    await bestEffort("session.expired_cleanup_failed", () =>
      db.session.deleteMany({ where: { id: row.id } }),
    );
    return null;
  }

  const { user } = row;
  if (!user.isActive || (user.lockedUntil !== null && user.lockedUntil > now)) return null;

  if (evaluation.shouldTouch) {
    // Failing to slide the idle window must not sign the user out.
    await bestEffort("session.touch_failed", () =>
      db.session.update({ where: { id: row.id }, data: { lastUsedAt: now } }),
    );
  }

  const roles: RoleKey[] = [];
  const permissions = new Set<Permission>();
  for (const { role } of user.roles) {
    if (isRoleKey(role.key)) roles.push(role.key);
    for (const { permission } of role.permissions) {
      if (isPermission(permission.key)) permissions.add(permission.key);
    }
  }

  return {
    sessionId: row.id,
    user: { id: user.id, email: user.email, name: user.name },
    roles,
    permissions,
  };
}

/**
 * The signed-in user for this request, or null. Memoised per request with React `cache`, so
 * layouts, pages and actions can all call it and the database is hit once.
 *
 * Because of that memoisation, do not expect it to notice a sign-out performed earlier in the
 * same request; sign-out ends with a redirect, which starts a new request.
 *
 * @throws DatabaseUnavailableError when a cookie is present but the database cannot be reached
 *   (that is an outage, not "signed out": callers must not bounce the user to the login page).
 */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  try {
    return await loadSession();
  } catch (error) {
    throw toDatabaseError(error);
  }
});

/** Ends the current session: cookie cleared, database row deleted. Safe to call when signed out. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  // A __Host- cookie can only be overwritten by a Set-Cookie that is itself Secure with Path=/,
  // which cookies().delete() does not guarantee, so expire it explicitly with the same attributes.
  store.set(SESSION_COOKIE, "", { ...COOKIE_BASE, maxAge: 0, expires: new Date(0) });
  if (!token) return;

  try {
    await getDb().session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  } catch (error) {
    logger.error("session.destroy_failed", { error });
  }
}

/** Revokes every session of a user (password change, deactivation, role change). Returns the count. */
export async function destroyAllSessionsForUser(userId: string): Promise<number> {
  try {
    const { count } = await getDb().session.deleteMany({ where: { userId } });
    return count;
  } catch (error) {
    throw toDatabaseError(error);
  }
}
