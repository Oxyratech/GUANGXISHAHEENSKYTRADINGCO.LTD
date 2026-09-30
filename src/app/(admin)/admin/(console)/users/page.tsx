import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminButtonLink, AdminLink } from "@/components/admin/AdminLink";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { FilterBar } from "@/components/admin/FilterBar";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ToggleActiveButton, UnlockButton } from "@/components/admin/users/UserStatusActions";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { buildPageMeta, parsePageParams, type RawSearchParams } from "@/server/admin/pagination";
import { formatRoleName } from "@/server/admin/format";
import { listUsers, type UserListRow } from "@/server/admin/users/queries";
import { isRoleKey, ROLE_DEFINITIONS, type RoleKey } from "@/server/auth/permissions";

export const metadata: Metadata = { title: "Users" };

const PATHNAME = "/admin/users";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function activeFilterOf(searchParams: RawSearchParams): boolean | undefined {
  const value = firstValue(searchParams.active);
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function statusBadge(row: UserListRow) {
  const locked = row.lockedUntil !== null && row.lockedUntil > new Date();
  if (locked) return <StatusBadge status="LOCKED" label="Locked" />;
  return row.isActive ? (
    <StatusBadge status="ACTIVE" label="Active" />
  ) : (
    <StatusBadge status="INACTIVE" label="Inactive" tone="neutral" />
  );
}

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const access = await requireAdminPage("user:read", { next: PATHNAME });
  if (!access.ok) return <AdminAccessFailure access={access} permission="user:read" />;
  const { session } = access;

  const rawSearchParams = await searchParams;
  const search = firstValue(rawSearchParams.search)?.trim() || undefined;
  const roleParam = firstValue(rawSearchParams.role);
  const role: RoleKey | undefined = roleParam && isRoleKey(roleParam) ? roleParam : undefined;
  const active = activeFilterOf(rawSearchParams);
  const page = parsePageParams(rawSearchParams);

  const canWrite = hasAdminPermission(session, "user:write");
  const canAssignRoles = hasAdminPermission(session, "user:assign-role");

  let rows: UserListRow[] = [];
  let total = 0;
  try {
    ({ rows, total } = await listUsers({ search, role, active }, page));
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Users" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  const meta = buildPageMeta(total, page.page, page.pageSize);

  const columns: DataTableColumn<UserListRow>[] = [
    {
      key: "name",
      header: "Name",
      rowHeader: true,
      cell: (row) => (
        <div className="grid gap-0.5">
          <AdminLink href={`/admin/users/${row.id}`} className="font-medium">
            {row.name}
          </AdminLink>
          <span className="text-caption text-ink-muted">{row.email}</span>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.length === 0 ? (
            <span className="text-ink-subtle">&mdash;</span>
          ) : (
            row.roles.map((roleKey) => (
              <Badge key={roleKey} variant={roleKey === "SUPER_ADMIN" ? "gold" : "neutral"}>
                {formatRoleName(roleKey)}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    { key: "status", header: "Status", cell: statusBadge },
    {
      key: "lastLoginAt",
      header: "Last sign-in",
      cell: (row) => <LocalDateTime value={row.lastLoginAt} />,
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: "Actions",
            align: "end" as const,
            cell: (row: UserListRow) => (
              <div className="flex flex-wrap justify-end gap-2">
                <UnlockButton
                  id={row.id}
                  locked={row.lockedUntil !== null && row.lockedUntil > new Date()}
                />
                <ToggleActiveButton
                  id={row.id}
                  isActive={row.isActive}
                  disabled={row.id === session.user.id}
                  disabledReason={row.id === session.user.id ? "This is your account" : undefined}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Users"
        description="Admin accounts that can sign in to this console."
        actions={
          canWrite && canAssignRoles ? (
            <AdminButtonLink href="/admin/users/new">New user</AdminButtonLink>
          ) : undefined
        }
      />

      <div className="grid gap-4">
        <FilterBar
          pathname={PATHNAME}
          searchParams={rawSearchParams}
          filterKeys={["search", "role", "active"]}
          label="Filter users"
        >
          <Input
            type="search"
            name="search"
            placeholder="Search by name or email"
            defaultValue={search ?? ""}
            className="w-64 max-w-full"
            aria-label="Search by name or email"
          />
          <Select
            name="role"
            defaultValue={role ?? ""}
            aria-label="Filter by role"
            className="w-48"
          >
            <option value="">All roles</option>
            {ROLE_DEFINITIONS.map((roleDef) => (
              <option key={roleDef.key} value={roleDef.key}>
                {roleDef.name}
              </option>
            ))}
          </Select>
          <Select
            name="active"
            defaultValue={active === undefined ? "" : String(active)}
            aria-label="Filter by status"
            className="w-40"
          >
            <option value="">Any status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </FilterBar>

        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          caption="Admin users"
          emptyState={
            <EmptyState
              title={
                search || role || active !== undefined
                  ? "No users match these filters."
                  : "No users yet."
              }
              description={
                search || role || active !== undefined
                  ? "Try a different search or clear the filters."
                  : "Create the first admin user to get started."
              }
              className="py-10"
            />
          }
        />

        <AdminPagination
          meta={meta}
          pathname={PATHNAME}
          searchParams={rawSearchParams}
          itemLabel="users"
        />
      </div>
    </>
  );
}
