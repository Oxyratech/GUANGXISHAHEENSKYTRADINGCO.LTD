"use client";

import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { RolesFieldset } from "@/components/admin/users/RolesFieldset";
import { updateUserRoles } from "@/server/admin/users/actions";
import type { RoleKey } from "@/server/auth/permissions";

export interface UserRolesFormProps {
  id: string;
  currentRoles: readonly RoleKey[];
  actorIsSuperAdmin: boolean;
  isSelf: boolean;
  isLastActiveSuperAdmin: boolean;
  updatedAt: string;
}

/** Replaces the roles a user holds. Saving always signs the user's other sessions out. */
export function UserRolesForm({
  id,
  currentRoles,
  actorIsSuperAdmin,
  isSelf,
  isLastActiveSuperAdmin,
  updatedAt,
}: UserRolesFormProps) {
  const hasSuperAdmin = currentRoles.includes("SUPER_ADMIN");
  let superAdminLockReason: string | undefined;
  if (!actorIsSuperAdmin) superAdminLockReason = "Only a Super Admin can change this.";
  else if (hasSuperAdmin && isSelf)
    superAdminLockReason = "You cannot remove your own Super Admin role.";
  else if (hasSuperAdmin && isLastActiveSuperAdmin) {
    superAdminLockReason = "This is the only active Super Admin; promote another user first.";
  }

  return (
    <ActionForm
      key={updatedAt}
      action={updateUserRoles}
      successMessage="Roles updated. The user's other sessions were signed out."
    >
      <input type="hidden" name="id" value={id} />
      <RolesFieldset
        defaultSelected={currentRoles}
        locked={superAdminLockReason ? { SUPER_ADMIN: superAdminLockReason } : {}}
      />
      <div>
        <ActionSubmit pendingLabel="Saving…">Save roles</ActionSubmit>
      </div>
    </ActionForm>
  );
}
