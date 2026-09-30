"use client";

import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Input } from "@/components/ui/input";
import { changeOwnPassword } from "@/server/admin/account/actions";

/** Changing your own password. Signs every other session of the account out, but keeps this one. */
export function ChangePasswordForm() {
  return (
    <ActionForm
      action={changeOwnPassword}
      successMessage="Password changed. Your other sessions were signed out."
      className="max-w-md gap-5"
    >
      <ActionField name="currentPassword" label="Current password" required>
        <Input type="password" autoComplete="current-password" maxLength={1024} />
      </ActionField>
      <ActionField
        name="newPassword"
        label="New password"
        required
        hint="12–128 characters, mixing at least two kinds of character."
      >
        <Input type="password" autoComplete="new-password" maxLength={128} />
      </ActionField>
      <ActionField name="confirmPassword" label="Confirm new password" required>
        <Input type="password" autoComplete="new-password" maxLength={128} />
      </ActionField>
      <div>
        <ActionSubmit pendingLabel="Changing…">Change password</ActionSubmit>
      </div>
    </ActionForm>
  );
}
