import { AdminNotFound } from "@/components/admin/AdminNotFound";
import { AdminShell } from "@/components/admin/AdminShell";
import { logger } from "@/lib/logger";
import { getSession, type AuthSession } from "@/server/auth/session";

/**
 * 404 for anything in the admin that calls notFound() (a record that does not exist or was deleted).
 * Next renders it inside the root layout but above the console layout, so it puts the shell back
 * itself when the visitor is signed in, and stands alone when they are not (or the database is down).
 */
export default async function AdminNotFoundPage() {
  let session: AuthSession | null = null;
  try {
    session = await getSession();
  } catch (error) {
    logger.warn("admin.not_found_session_unavailable", { error });
  }

  if (!session) return <AdminNotFound standalone />;
  return (
    <AdminShell session={session}>
      <AdminNotFound />
    </AdminShell>
  );
}
