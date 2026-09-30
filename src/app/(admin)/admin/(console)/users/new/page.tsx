import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { PageHeader } from "@/components/admin/PageHeader";
import { UserCreateForm } from "@/components/admin/users/UserCreateForm";
import { requireAdminPage } from "@/server/admin/access";

export const metadata: Metadata = { title: "New user" };

/** Creating a user needs both permissions: user:write for the account, user:assign-role for its roles. */
export default async function NewUserPage() {
  const access = await requireAdminPage("user:write", { next: "/admin/users/new" });
  if (!access.ok) return <AdminAccessFailure access={access} permission="user:write" />;
  const { session } = access;

  if (!session.permissions.has("user:assign-role")) {
    return (
      <AdminAccessFailure
        access={{ ok: false, reason: "forbidden" }}
        permission="user:assign-role"
      />
    );
  }

  return (
    <>
      <PageHeader
        title="New user"
        breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: "New user" }]}
      />
      <UserCreateForm actorIsSuperAdmin={session.roles.includes("SUPER_ADMIN")} />
    </>
  );
}
