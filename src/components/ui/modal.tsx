"use client";

/*
 * Centered dialog. `title` and `description` are required (Radix warns and screen readers lose the
 * dialog's name otherwise); hide them visually with hideTitle / hideDescription when the design
 * does not want them. Esc and overlay click close it, Tab is trapped, focus returns to the trigger.
 *
 *   <Modal trigger={<Button>Open</Button>} title="…" description="…" closeLabel={t("close")}>…</Modal>
 *   <Modal open={open} onOpenChange={setOpen} … />   // controlled
 */
import { cn } from "@/lib/utils";
import { DialogShell, type DialogShellProps } from "./dialog-shell";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
} as const;

export type ModalProps = DialogShellProps & { size?: keyof typeof SIZES };

export function Modal({ size = "md", ...props }: ModalProps) {
  return (
    <DialogShell
      {...props}
      contentClassName={cn(
        "inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] rounded-lg",
        SIZES[size],
      )}
    />
  );
}
