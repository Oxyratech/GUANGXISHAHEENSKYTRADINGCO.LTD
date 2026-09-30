"use client";

import { useState } from "react";
import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { resetUserPassword } from "@/server/admin/users/actions";

/**
 * Sets a new password chosen by the admin. It never mails or displays the password anywhere the log
 * or the database could keep it: the admin types it once here and communicates it out of band.
 */
export function ResetPasswordPanel({ id, email }: { id: string; email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Modal
      size="sm"
      trigger={<Button variant="outline">Reset password</Button>}
      open={open}
      onOpenChange={setOpen}
      title="Reset password"
      description={`Sets a new password for ${email} and signs out every session of this account. Share the new password with them outside this system.`}
      closeLabel="Close"
    >
      <ActionForm
        action={resetUserPassword}
        successMessage="Password reset."
        onSuccess={() => setOpen(false)}
      >
        <input type="hidden" name="id" value={id} />
        <ActionField
          name="password"
          label="New password"
          required
          hint="12–128 characters, mixing at least two kinds of character."
        >
          <Input type="password" autoComplete="new-password" maxLength={128} />
        </ActionField>
        <ActionField name="confirmPassword" label="Confirm new password" required>
          <Input type="password" autoComplete="new-password" maxLength={128} />
        </ActionField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <ActionSubmit pendingLabel="Resetting…">Reset password</ActionSubmit>
        </div>
      </ActionForm>
    </Modal>
  );
}
