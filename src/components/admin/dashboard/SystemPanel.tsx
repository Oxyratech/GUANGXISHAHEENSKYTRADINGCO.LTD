import { DefinitionList } from "@/components/admin/DefinitionList";
import { formatRoleName } from "@/server/admin/format";
import type { RoleKey } from "@/server/auth/permissions";

export type DatabaseStatus = "connected" | "not_configured" | "unreachable";

const DATABASE_TEXT: Record<DatabaseStatus, string> = {
  connected: "Configured and reachable",
  not_configured: "Not configured (DATABASE_URL is missing)",
  unreachable: "Configured, but not reachable right now",
};

/** Facts about this installation and the signed-in user. Only what is actually known is shown. */
export function SystemPanel({
  database,
  user,
  roles,
}: {
  database: DatabaseStatus;
  user: { name: string; email: string };
  roles: readonly RoleKey[];
}) {
  return (
    <section
      aria-labelledby="dashboard-system"
      className="rounded-lg border border-line bg-white p-4 shadow-card"
    >
      <h2 id="dashboard-system" className="mb-3 text-body font-semibold text-navy-900">
        System
      </h2>
      <DefinitionList
        columns={1}
        items={[
          { label: "Database", value: DATABASE_TEXT[database] },
          { label: "Signed in as", value: `${user.name} (${user.email})` },
          { label: "Roles", value: roles.length > 0 ? roles.map(formatRoleName).join(", ") : null },
        ]}
      />
    </section>
  );
}
