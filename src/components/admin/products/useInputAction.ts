"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import type { AdminActionState } from "@/server/admin/action-state";

/**
 * Runs a defineAdminInputAction function (a plain object call, not a <form>) and shows the result as a
 * toast. Used for the Images/Documents/Specifications panels' small immediate actions (reorder, set
 * primary, per-locale translation edits) that need no confirmation dialog — removal, which does, goes
 * through ConfirmInputButton instead.
 */
export function useInputAction<R>(action: (input: unknown) => Promise<AdminActionState<R>>) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function run(input: unknown, onSuccess?: (data: R) => void) {
    startTransition(async () => {
      let result;
      try {
        result = await action(input);
      } catch {
        toast({
          title: "The request could not be completed. Check your connection and try again.",
          variant: "danger",
        });
        return;
      }
      if (result.status === "success") {
        if (result.message) toast({ title: result.message, variant: "success" });
        if (result.data !== undefined) onSuccess?.(result.data);
      } else if (result.status === "error") {
        toast({ title: result.message, variant: "danger" });
      }
    });
  }

  return { run, pending };
}
