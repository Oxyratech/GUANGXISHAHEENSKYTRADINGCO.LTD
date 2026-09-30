import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { PermissionMatrixTable } from "@/components/admin/roles/PermissionMatrixTable";
import { RolePermissionsForm } from "@/components/admin/roles/RolePermissionsForm";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { PERMISSION_GROUPS, loadRoleMatrix } from "@/server/admin/roles/queries";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const access = await requireAdminPage("role:read", { next: "/admin/roles" });
  if (!access.ok) return <AdminAccessFailure access={access} permission="role:read" />;
  const { session } = access;

  let roles;
  try {
    roles = await loadRoleMatrix();
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Roles" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  const canWrite = hasAdminPermission(session, "role:write");

  return (
    <>
      <PageHeader
        title="Roles"
        description="The four roles this console recognises, and what each one can do."
      />

      <div className="grid gap-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <div key={role.key} className="rounded-lg border border-line bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-label text-ink">{role.name}</h2>
                {role.locked ? <Badge variant="gold">Locked</Badge> : null}
              </div>
              <p className="mt-1 text-small text-ink-muted">{role.description}</p>
              <p className="mt-2 text-caption text-ink-subtle">
                {role.userCount} {role.userCount === 1 ? "user" : "users"} &middot;{" "}
                {role.permissions.size} permissions
              </p>
            </div>
          ))}
        </section>

        <PermissionMatrixTable roles={roles} groups={PERMISSION_GROUPS} />

        {canWrite ? (
          <section className="grid gap-6">
            <Alert variant="info" title="The seed restores baseline grants">
              Running <code className="font-mono text-caption">npm run db:seed</code> re-adds any
              baseline permission removed here; it never removes a grant added here. To change a
              role&apos;s baseline for good, edit its definition in the code.
            </Alert>
            {roles
              .filter((role) => !role.locked)
              .map((role) => (
                <div
                  key={role.key}
                  className="rounded-lg border border-line bg-white p-5 shadow-card"
                >
                  <h2 className="mb-1 text-label text-ink">{role.name}</h2>
                  <p className="mb-4 text-small text-ink-muted">{role.description}</p>
                  <RolePermissionsForm
                    roleKey={role.key}
                    groups={PERMISSION_GROUPS}
                    granted={role.permissions}
                  />
                </div>
              ))}
          </section>
        ) : null}
      </div>
    </>
  );
}
