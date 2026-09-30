"use client";

import { CircleAlert } from "lucide-react";
import { useId } from "react";
import { useActionForm } from "@/components/admin/ActionForm";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ROLE_DEFINITIONS, type RoleKey } from "@/server/auth/permissions";

/**
 * The role checkbox group shared by the create-user and edit-roles forms. A role named in `locked`
 * is shown but cannot be toggled here: a hidden input keeps its current value in the submission, so
 * nobody can accidentally strip or grant it by saving the rest of the form (the server enforces the
 * same rules regardless; see server/admin/users/guards). The map's value is the reason shown under
 * that role, e.g. "Only a Super Admin can change this." or "You cannot remove your own Super Admin role."
 */
export function RolesFieldset({
  name = "roles",
  defaultSelected,
  locked = {},
}: {
  name?: string;
  defaultSelected: readonly RoleKey[];
  locked?: Partial<Record<RoleKey, string>>;
}) {
  const { fieldErrors } = useActionForm();
  const error = fieldErrors[name]?.join(" ");
  const baseId = useId();
  const errorId = `${baseId}-error`;

  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      className="m-0 grid min-w-0 gap-1.5 border-0 p-0"
    >
      <legend className="mb-1.5 p-0 text-label text-ink">
        Roles
        <span aria-hidden className="ms-1 text-danger-600">
          *
        </span>
      </legend>
      <div className="grid gap-3 rounded-lg border border-line p-3.5">
        {ROLE_DEFINITIONS.map((role) => {
          const checked = defaultSelected.includes(role.key);
          const reason = locked[role.key];
          const controlId = `${baseId}-${role.key}`;
          return (
            <div key={role.key} className="flex items-start gap-3">
              <span className="flex h-[1lh] shrink-0 items-center">
                <Checkbox
                  id={controlId}
                  name={reason ? undefined : name}
                  value={role.key}
                  defaultChecked={checked}
                  disabled={Boolean(reason)}
                  aria-describedby={reason ? `${controlId}-locked` : undefined}
                />
                {reason && checked ? <input type="hidden" name={name} value={role.key} /> : null}
              </span>
              <Label
                htmlFor={controlId}
                className={cn("grid gap-0.5 font-normal", reason && "text-ink-muted")}
              >
                <span className="text-body text-ink">{role.name}</span>
                <span className="text-small text-ink-muted">{role.description}</span>
                {reason ? (
                  <span id={`${controlId}-locked`} className="text-caption text-ink-subtle">
                    {reason}
                  </span>
                ) : null}
              </Label>
            </div>
          );
        })}
      </div>
      <div id={errorId} aria-live="polite" className="empty:-mt-1.5">
        {error ? (
          <p className="flex items-start gap-1.5 text-small text-danger-600">
            <CircleAlert aria-hidden className="mt-[0.2em] size-4 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
