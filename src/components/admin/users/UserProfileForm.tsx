"use client";

import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { updateUserProfile } from "@/server/admin/users/actions";

export interface UserProfileFormProps {
  id: string;
  name: string;
  isActive: boolean;
  /** Disallow unchecking "Active": this is the signed-in user's own account, or the last Super Admin. */
  activeLocked?: boolean;
  activeLockedReason?: string;
  updatedAt: string;
}

/** Name and active flag. Deactivating destroys every session the account holds. */
export function UserProfileForm({
  id,
  name,
  isActive,
  activeLocked = false,
  activeLockedReason,
  updatedAt,
}: UserProfileFormProps) {
  return (
    <ActionForm key={updatedAt} action={updateUserProfile} successMessage="Profile updated.">
      <input type="hidden" name="id" value={id} />
      <ActionField name="name" label="Full name" required>
        <Input autoComplete="off" maxLength={120} defaultValue={name} />
      </ActionField>
      <ActionField
        name="active"
        label="Active"
        layout="inline"
        hint={activeLocked ? activeLockedReason : "An inactive user cannot sign in."}
      >
        <Checkbox defaultChecked={isActive} disabled={activeLocked} />
      </ActionField>
      {activeLocked && isActive ? <input type="hidden" name="active" value="on" /> : null}
      <div>
        <ActionSubmit pendingLabel="Saving…">Save profile</ActionSubmit>
      </div>
    </ActionForm>
  );
}
