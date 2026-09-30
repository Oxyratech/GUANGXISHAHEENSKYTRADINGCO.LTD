import { AdminNotFound } from "@/components/admin/AdminNotFound";
import { AdminShell } from "@/components/admin/AdminShell";
import { logger } from "@/lib/logger";
import { asDatabaseOutage } from "@/server/admin/access";
import { getSession, type AuthSession } from "@/server/auth/session";

/**
 * 404 for anything in the admin that calls notFound() (a record that does not exist or was deleted).
 * Next renders it inside the root layout but above the console layout, so it puts the shell back
 * itself when the visitor is signed in, and stands alone when they are not (or the database is down).
 *
 * Only a recognised database outage is treated as "no session" here. Anything else — most
 * importantly Next's own dynamic-rendering bailout signal, thrown by `cookies()` while Next probes
 * whether this route could be served statically — must propagate unchanged, or Next can wrongly
 * treat the probe as having succeeded and freeze this boundary as static with `session` baked in as
 * `null`. Same pattern as the login page's session check.
 */
export default async function AdminNotFoundPage() {
  let session: AuthSession | null = null;
  try {
    session = await getSession();
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    logger.warn("admin.not_found_session_unavailable", { cause: outage.cause });
  }

  if (!session) return <AdminNotFound standalone />;
  return (
    <AdminShell session={session}>
      <AdminNotFound />
    </AdminShell>
  );
}
