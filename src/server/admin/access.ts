import "server-only";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { hasAnyPermission, hasPermission, type AuthSession } from "@/server/auth/authorize";
import type { Permission } from "@/server/auth/permissions";
import { getSession } from "@/server/auth/session";
import {
  DatabaseUnavailableError,
  toDatabaseError,
  type DatabaseUnavailableCause,
} from "@/server/db/errors";
import { adminLoginPath } from "./next-path";

export type AdminPageAccess =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: "forbidden" }
  | { ok: false; reason: "database_unavailable"; cause: DatabaseUnavailableCause };

/**
 * The gate every admin page passes before it reads any data.
 *
 *   const access = await requireAdminPage("inquiry:read");
 *   if (!access.ok) return <AdminAccessFailure access={access} />;   // no data was read
 *
 * - No session: redirects to the login page (the redirect throws, so nothing after it runs).
 *   `options.next` is the page's own path, remembered so sign-in returns there.
 * - Signed in without the permission: `{ ok: false, reason: "forbidden" }`, the page renders
 *   <AccessDenied />.
 * - The database cannot be reached while looking the session up: `{ ok: false, reason: "database_unavailable", cause }`.
 *   That is an outage, so it is never treated as "signed out".
 */
export async function requireAdminPage(
  permission: Permission,
  options: { next?: string } = {},
): Promise<AdminPageAccess> {
  let session: AuthSession | null;
  try {
    session = await getSession();
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return { ok: false, reason: "database_unavailable", cause: outage.cause };
  }

  if (!session) redirect(adminLoginPath(options.next));

  if (!hasPermission(session, permission)) {
    logger.warn("auth.permission_denied", { userId: session.user.id, permission });
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, session };
}

/**
 * For `catch` blocks in pages: the outage behind an error, or null when it is something else (which
 * the caller should rethrow). Connection-level failures from Prisma count even if the repository
 * did not wrap them.
 */
export function asDatabaseOutage(error: unknown): DatabaseUnavailableError | null {
  const normalised = toDatabaseError(error);
  return normalised instanceof DatabaseUnavailableError ? normalised : null;
}

/** Whether the signed-in user holds a permission: for showing or hiding a button (never a gate). */
export { hasPermission as hasAdminPermission, hasAnyPermission as hasAnyAdminPermission };
