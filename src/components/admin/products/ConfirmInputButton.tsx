"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { AdminActionState } from "@/server/admin/action-state";

/**
 * ConfirmButton's counterpart for a defineAdminInputAction (a plain object call, not a <form>): the
 * Images/Documents/Specifications panels' row-level actions take `{ productId, ... }` objects built
 * from component state rather than form fields, so they cannot use ConfirmButton's FormData-only call.
 */
export function ConfirmInputButton<R>({
  action,
  input,
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
}: {
  action: (input: unknown) => Promise<AdminActionState<R>>;
  input: Record<string, unknown>;
  label: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  successMessage?: string;
  onSuccess?: (data: R) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function confirm() {
    startTransition(async () => {
      let result: AdminActionState<R>;
      try {
        result = await action(input);
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
        <Button type="button" variant={variant} size={size} className={className}>
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
