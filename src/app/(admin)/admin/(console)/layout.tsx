import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminStandalone } from "@/components/admin/AdminStandalone";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { asDatabaseOutage } from "@/server/admin/access";
import { requireSession, type AuthSession } from "@/server/auth/authorize";

/**
 * Everything in the admin except the login page lives under this layout. It signs the visitor in or
 * sends them to /admin/login, then draws the shell around the page.
 *
 * This is a convenience, not the gate: a layout does not re-render on every navigation, so each page
 * and each Server Action checks its own permission on the server (requireAdminPage, defineAdminAction).
 *
 * A database outage while looking the session up is reported as an outage: the visitor may well be
 * signed in, so sending them to the login page (which cannot work either) would be wrong.
 */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  let session: AuthSession;
  try {
    session = await requireSession();
  } catch (error) {
    // redirect() is not an outage, and is rethrown so Next can send the visitor to the login page.
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <AdminStandalone>
        <DatabaseUnavailablePanel cause={outage.cause} />
      </AdminStandalone>
    );
  }

  return <AdminShell session={session}>{children}</AdminShell>;
}
