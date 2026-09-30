import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminNotFound } from "@/components/admin/AdminNotFound";
import { CopyValue } from "@/components/admin/CopyValue";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { DefinitionList, type DefinitionItem } from "@/components/admin/DefinitionList";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { PageHeader } from "@/components/admin/PageHeader";
import { ResetPasswordPanel } from "@/components/admin/users/ResetPasswordPanel";
import { UserProfileForm } from "@/components/admin/users/UserProfileForm";
import { UserRolesForm } from "@/components/admin/users/UserRolesForm";
import { UnlockButton } from "@/components/admin/users/UserStatusActions";
import { Badge } from "@/components/ui/badge";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { formatRoleName } from "@/server/admin/format";
import { countOtherActiveSuperAdmins, getUserById } from "@/server/admin/users/queries";

export const metadata: Metadata = { title: "User" };

export default async function UserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const access = await requireAdminPage("user:read", { next: `/admin/users/${id}` });
  if (!access.ok) return <AdminAccessFailure access={access} permission="user:read" />;
  const { session } = access;

  let user;
  try {
    user = await getUserById(id);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="User" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }
  if (!user) return <AdminNotFound />;

  const isSelf = session.user.id === user.id;
  const hasSuperAdmin = user.roles.includes("SUPER_ADMIN");
  let isLastActiveSuperAdmin = false;
  if (hasSuperAdmin && user.isActive) {
    isLastActiveSuperAdmin = (await countOtherActiveSuperAdmins(user.id)) === 0;
  }

  const canWrite = hasAdminPermission(session, "user:write");
  const canAssignRoles = hasAdminPermission(session, "user:assign-role");
  const locked = user.lockedUntil !== null && user.lockedUntil > new Date();

  const summary: DefinitionItem[] = [
    { label: "Email", value: user.email },
    {
      label: "Status",
      value: locked ? (
        <Badge variant="warning">Locked</Badge>
      ) : user.isActive ? (
        <Badge variant="success">Active</Badge>
      ) : (
        <Badge>Inactive</Badge>
      ),
    },
    { label: "Roles", value: user.roles.map((role) => formatRoleName(role)).join(", ") || null },
    { label: "Sign-ins", value: <LocalDateTime value={user.lastLoginAt} /> },
    { label: "Created", value: <LocalDateTime value={user.createdAt} /> },
    { label: "Failed sign-in attempts", value: user.failedLoginCount || null },
    { label: "Active sessions", value: user.sessionCount },
    { label: "User id", value: <CopyValue value={user.id} label="user id" mono />, wide: true },
  ];

  return (
    <>
      <PageHeader
        title={user.name}
        description={user.email}
        breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: user.name }]}
        actions={
          <>
            <UnlockButton id={user.id} locked={locked} />
            {canWrite ? <ResetPasswordPanel id={user.id} email={user.email} /> : null}
          </>
        }
      />

      <div className="grid gap-6">
        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <h2 className="mb-4 text-label text-ink">Summary</h2>
          <DefinitionList items={summary} columns={3} />
        </section>

        {canWrite ? (
          <section className="rounded-lg border border-line bg-white p-5 shadow-card">
            <h2 className="mb-4 text-label text-ink">Profile</h2>
            <UserProfileForm
              id={user.id}
              name={user.name}
              isActive={user.isActive}
              activeLocked={user.isActive && (isSelf || isLastActiveSuperAdmin)}
              activeLockedReason={
                isSelf
                  ? "You cannot deactivate your own account."
                  : isLastActiveSuperAdmin
                    ? "This is the only active Super Admin; promote another user first."
                    : undefined
              }
              updatedAt={user.updatedAt.toISOString()}
            />
          </section>
        ) : null}

        {canAssignRoles ? (
          <section className="rounded-lg border border-line bg-white p-5 shadow-card">
            <h2 className="mb-4 text-label text-ink">Roles</h2>
            <UserRolesForm
              id={user.id}
              currentRoles={user.roles}
              actorIsSuperAdmin={session.roles.includes("SUPER_ADMIN")}
              isSelf={isSelf}
              isLastActiveSuperAdmin={isLastActiveSuperAdmin}
              updatedAt={user.updatedAt.toISOString()}
            />
          </section>
        ) : null}
      </div>
    </>
  );
}
