"use client";

import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { humanizeCode } from "@/server/admin/format";
import { updateRolePermissions } from "@/server/admin/roles/actions";
import type { PermissionGroup } from "@/server/admin/roles/queries";
import { PERMISSIONS, type Permission, type RoleKey } from "@/server/auth/permissions";

/** Editing one role's permission set. Applied transactionally; SUPER_ADMIN is never editable here. */
export function RolePermissionsForm({
  roleKey,
  groups,
  granted,
}: {
  roleKey: RoleKey;
  groups: readonly PermissionGroup[];
  granted: ReadonlySet<Permission>;
}) {
  return (
    <ActionForm
      action={updateRolePermissions}
      successMessage="Role permissions updated."
      className="gap-4"
    >
      <input type="hidden" name="roleKey" value={roleKey} />
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <fieldset key={group.resource} className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-0.5 p-0 text-caption font-medium tracking-wide text-ink-muted uppercase">
              {humanizeCode(group.resource)}
            </legend>
            {group.permissions.map((permission) => (
              <PermissionCheckbox
                key={permission}
                permission={permission}
                defaultChecked={granted.has(permission)}
              />
            ))}
          </fieldset>
        ))}
      </div>
      <div>
        <ActionSubmit pendingLabel="Saving…">Save permissions</ActionSubmit>
      </div>
    </ActionForm>
  );
}

function PermissionCheckbox({
  permission,
  defaultChecked,
}: {
  permission: Permission;
  defaultChecked: boolean;
}) {
  const controlId = `perm-${permission}`;
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-[1lh] shrink-0 items-center">
        <Checkbox
          id={controlId}
          name="permissions"
          value={permission}
          defaultChecked={defaultChecked}
        />
      </span>
      <Label htmlFor={controlId} className="text-small font-normal text-ink">
        {PERMISSIONS[permission]}
      </Label>
    </div>
  );
}
