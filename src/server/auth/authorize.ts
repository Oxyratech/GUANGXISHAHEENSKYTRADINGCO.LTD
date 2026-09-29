import "server-only";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import type { Permission } from "./permissions";
import { getSession, type AuthSession } from "./session";

export type { AuthSession };

const LOGIN_PATH = "/admin/login";

export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  readonly permission: Permission | undefined;

  constructor(permission?: Permission) {
    super(permission ? `Missing permission: ${permission}` : "Forbidden");
    this.name = "AuthorizationError";
    this.permission = permission;
  }
}

export function hasPermission(session: AuthSession, permission: Permission): boolean {
  return session.permissions.has(permission);
}

export function hasAnyPermission(
  session: AuthSession,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => session.permissions.has(permission));
}

/**
 * For pages and layouts: the signed-in user, or a redirect to the login page. The redirect throws
 * (Next's control-flow error), so nothing after a failed check runs.
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  return session;
}

/**
 * For Server Actions and Route Handlers, where a redirect is the wrong answer (an action should
 * return an error, a route should send 401): throws AuthenticationError instead.
 */
export async function requireSessionOrThrow(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  return session;
}

function deny(session: AuthSession, permission: Permission): never {
  logger.warn("auth.permission_denied", { userId: session.user.id, permission });
  throw new AuthorizationError(permission);
}

/**
 * The gate for admin pages: unauthenticated visitors are redirected to the login page; signed-in
 * users without `permission` get an AuthorizationError (render it with an error boundary; Next's
 * `forbidden()` is still experimental and needs `experimental.authInterrupts`, so it is not used).
 */
export async function requirePermission(permission: Permission): Promise<AuthSession> {
  const session = await requireSession();
  if (!hasPermission(session, permission)) deny(session, permission);
  return session;
}

/** Same check for Server Actions and Route Handlers: throws AuthenticationError instead of redirecting. */
export async function requirePermissionOrThrow(permission: Permission): Promise<AuthSession> {
  const session = await requireSessionOrThrow();
  if (!hasPermission(session, permission)) deny(session, permission);
  return session;
}
