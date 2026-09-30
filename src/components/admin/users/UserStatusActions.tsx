"use client";

import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { setUserActive, unlockUser } from "@/server/admin/users/actions";

/** Quick deactivate/reactivate, confirmed first. Hidden entirely where the guard would refuse it. */
export function ToggleActiveButton({
  id,
  isActive,
  disabled = false,
  disabledReason,
}: {
  id: string;
  isActive: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  if (disabled) {
    return (
      <span className="text-small text-ink-subtle" title={disabledReason}>
        {disabledReason}
      </span>
    );
  }

  return (
    <ConfirmButton
      action={setUserActive}
      fields={{ id, active: isActive ? "" : "on" }}
      label={isActive ? "Deactivate" : "Reactivate"}
      variant="outline"
      size="sm"
      destructive={isActive}
      title={isActive ? "Deactivate user" : "Reactivate user"}
      description={
        isActive
          ? "The user will no longer be able to sign in, and every session they hold will be signed out."
          : "The user will be able to sign in again."
      }
      confirmLabel={isActive ? "Deactivate" : "Reactivate"}
      successMessage={isActive ? "User deactivated." : "User reactivated."}
    />
  );
}

/** Only rendered when the account is actually locked. */
export function UnlockButton({ id, locked }: { id: string; locked: boolean }) {
  if (!locked) return null;

  return (
    <ConfirmButton
      action={unlockUser}
      fields={{ id }}
      label="Unlock"
      variant="outline"
      size="sm"
      destructive={false}
      title="Unlock account"
      description="Clears the failed sign-in count so this user can sign in again immediately."
      confirmLabel="Unlock"
      successMessage="Account unlocked."
    />
  );
}
