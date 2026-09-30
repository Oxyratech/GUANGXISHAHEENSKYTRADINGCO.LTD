import type { AdminPageAccess } from "@/server/admin/access";
import type { Permission } from "@/server/auth/permissions";
import { AccessDenied } from "./AccessDenied";
import { DatabaseUnavailablePanel } from "./DatabaseUnavailablePanel";

/**
 * What a page returns when requireAdminPage said no: the 403 panel, or the outage panel. Because it
 * is returned before the page loads anything, a user without access never causes a query.
 *
 *   const access = await requireAdminPage("inquiry:read");
 *   if (!access.ok) return <AdminAccessFailure access={access} permission="inquiry:read" />;
 */
export function AdminAccessFailure({
  access,
  permission,
}: {
  access: Extract<AdminPageAccess, { ok: false }>;
  permission?: Permission;
}) {
  return access.reason === "forbidden" ? (
    <AccessDenied permission={permission} />
  ) : (
    <DatabaseUnavailablePanel cause={access.cause} />
  );
}
