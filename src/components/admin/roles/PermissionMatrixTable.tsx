import { Check, Lock } from "lucide-react";
import { humanizeCode } from "@/server/admin/format";
import { PERMISSIONS, type Permission } from "@/server/auth/permissions";
import type { PermissionGroup, RoleRow } from "@/server/admin/roles/queries";

/**
 * The read-only overview: every permission (grouped by the resource it governs) against every role,
 * so an operator can see the whole access model at a glance before opening a role to edit it.
 */
export function PermissionMatrixTable({
  roles,
  groups,
}: {
  roles: readonly RoleRow[];
  groups: readonly PermissionGroup[];
}) {
  return (
    <div
      role="region"
      aria-label="Permission matrix"
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-line bg-white"
    >
      <table className="w-full min-w-[640px] border-collapse text-small">
        <caption className="px-4 py-3 text-start text-label text-ink">
          Permissions granted to each role
        </caption>
        <thead>
          <tr className="border-y border-line bg-surface">
            <th scope="col" className="px-4 py-2.5 text-start text-label text-ink-muted">
              Permission
            </th>
            {roles.map((role) => (
              <th
                key={role.key}
                scope="col"
                className="px-3 py-2.5 text-center text-label text-ink-muted"
              >
                {role.name}
                {role.locked ? (
                  <Lock aria-label="Locked" className="ms-1 inline size-3.5 align-text-top" />
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <PermissionGroupRows key={group.resource} group={group} roles={roles} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PermissionGroupRows({
  group,
  roles,
}: {
  group: PermissionGroup;
  roles: readonly RoleRow[];
}) {
  return (
    <>
      <tr className="border-b border-line bg-surface/60">
        <th
          scope="colgroup"
          colSpan={roles.length + 1}
          className="px-4 py-1.5 text-start text-caption font-medium tracking-wide text-ink-muted uppercase"
        >
          {humanizeCode(group.resource)}
        </th>
      </tr>
      {group.permissions.map((permission) => (
        <PermissionRow key={permission} permission={permission} roles={roles} />
      ))}
    </>
  );
}

function PermissionRow({
  permission,
  roles,
}: {
  permission: Permission;
  roles: readonly RoleRow[];
}) {
  return (
    <tr className="border-b border-line last:border-b-0">
      <th scope="row" className="px-4 py-2.5 text-start font-normal text-ink">
        <code className="font-mono text-caption text-ink-muted">{permission}</code>
        <span className="block text-small text-ink">{PERMISSIONS[permission]}</span>
      </th>
      {roles.map((role) => {
        const granted = role.permissions.has(permission);
        return (
          <td key={role.key} className="px-3 py-2.5 text-center">
            {granted ? (
              <>
                <Check aria-hidden className="mx-auto size-4 text-success-600" />
                <span className="sr-only">Granted</span>
              </>
            ) : (
              <span className="sr-only">Not granted</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}
