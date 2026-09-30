import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { DashboardView } from "@/components/admin/dashboard/DashboardView";
import { SystemPanel } from "@/components/admin/dashboard/SystemPanel";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { asDatabaseOutage, requireAdminPage } from "@/server/admin/access";
import { loadDashboard, type DashboardData } from "@/server/admin/dashboard/queries";
import { isDatabaseConfigured } from "@/server/db";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The admin landing page: real counts and rows from the database, each block only for users who hold
 * its permission. The permission is checked before anything is read; a database outage renders an
 * honest panel (with the system facts that are still known) rather than a crash or a login redirect.
 */
export default async function DashboardPage() {
  const access = await requireAdminPage("dashboard:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="dashboard:read" />;
  const { session } = access;

  let data: DashboardData;
  try {
    data = await loadDashboard(session.permissions);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4">
          <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
          <SystemPanel
            database={isDatabaseConfigured() ? "unreachable" : "not_configured"}
            user={session.user}
            roles={session.roles}
          />
        </div>
      </>
    );
  }

  return <DashboardView data={data} session={session} />;
}
