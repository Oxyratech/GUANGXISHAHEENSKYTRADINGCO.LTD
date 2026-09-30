import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { ChangePasswordForm } from "@/components/admin/account/ChangePasswordForm";
import { SignOutEverywhereButton } from "@/components/admin/account/SignOutEverywhereButton";
import { DefinitionList, type DefinitionItem } from "@/components/admin/DefinitionList";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatRoleName } from "@/server/admin/format";
import { requireAdminPage } from "@/server/admin/access";

export const metadata: Metadata = { title: "Account" };

/**
 * The signed-in user's own account. Gated on dashboard:read (every seeded role holds it, so this is
 * "any signed-in admin user", not a role-specific screen) rather than skipping the permission gate.
 */
export default async function AccountPage() {
  const access = await requireAdminPage("dashboard:read", { next: "/admin/account" });
  if (!access.ok) return <AdminAccessFailure access={access} />;
  const { session } = access;

  const summary: DefinitionItem[] = [
    { label: "Name", value: session.user.name },
    { label: "Email", value: session.user.email },
    { label: "Roles", value: session.roles.map((role) => formatRoleName(role)).join(", ") || null },
  ];

  return (
    <>
      <PageHeader title="Account" description="Your own sign-in details and session." />

      <div className="grid gap-6">
        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <h2 className="mb-4 text-label text-ink">Summary</h2>
          <DefinitionList items={summary} columns={2} />
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <h2 className="mb-4 text-label text-ink">Change password</h2>
          <ChangePasswordForm />
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <h2 className="mb-1 text-label text-ink">Sessions</h2>
          <p className="mb-4 text-small text-ink-muted">
            If you suspect a device or browser you no longer use still has an active session, end
            every session at once, including this one.
          </p>
          <SignOutEverywhereButton />
        </section>
      </div>
    </>
  );
}
