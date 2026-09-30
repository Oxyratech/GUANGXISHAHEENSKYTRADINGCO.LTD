"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { AdminActionState, AdminFormAction } from "@/server/admin/action-state";
import { ConfirmDialog } from "./ConfirmDialog";

export interface ConfirmButtonProps<R> {
  /** A Server Action built with defineAdminAction. */
  action: AdminFormAction<R>;
  /** Sent to the action as form fields, typically `{ id, version }`. */
  fields?: Record<string, string>;
  /** Text of the button that opens the dialog. */
  label: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  title: string;
  description: ReactNode;
  /** Explicit wording of the confirm button: "Delete product". */
  confirmLabel: string;
  destructive?: boolean;
  /** Toast text on success when the action returns no message. */
  successMessage?: string;
  onSuccess?: (data: R) => void;
}

/**
 * A button that asks first, then runs a Server Action. The action's own permission check and
 * validation still decide whether it happens; this only adds the "are you sure". A failure keeps
 * the dialog open with the reason; a success closes it, shows a toast and calls `onSuccess`.
 *
 * Deleting or leaving the page from `onSuccess` (router.push) is up to the caller. A page that only
 * needs revalidation can rely on the action's own revalidatePath.
 */
export function ConfirmButton<R>({
  action,
  fields,
  label,
  variant = "outline",
  size,
  className,
  title,
  description,
  confirmLabel,
  destructive = true,
  successMessage = "Done",
  onSuccess,
}: ConfirmButtonProps<R>) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function confirm() {
    startTransition(async () => {
      const formData = new FormData();
      for (const [name, value] of Object.entries(fields ?? {})) formData.set(name, value);

      let result: AdminActionState<R>;
      try {
        result = await action(undefined, formData);
      } catch {
        setError("The request could not be completed. Check your connection and try again.");
        return;
      }

      if (result.status === "success") {
        setOpen(false);
        toast({ title: result.message ?? successMessage, variant: "success" });
        onSuccess?.(result.data);
      } else if (result.status === "error") {
        setError(result.message);
      }
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (next) setError(null);
        setOpen(next);
      }}
      trigger={
        <Button variant={variant} size={size} className={className}>
          {label}
        </Button>
      }
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      destructive={destructive}
      pending={pending}
      error={error}
      onConfirm={confirm}
    />
  );
}
