"use client";

import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The element that opens the dialog. Passing it (rather than opening the dialog from a handler of
   * your own) is what makes Radix return focus to it when the dialog closes.
   */
  trigger?: ReactNode;
  title: string;
  /** What will happen and whether it can be undone. It is the dialog's accessible description. */
  description: ReactNode;
  /** Names the action itself ("Delete product", "Unpublish article"), never "OK" or "Yes". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm button. Defaults to true: this dialog exists for actions that are hard to undo. */
  destructive?: boolean;
  /** The action is running: the confirm button shows progress and the dialog cannot be dismissed. */
  pending?: boolean;
  /** Why the last attempt failed; the dialog stays open so the person can retry or cancel. */
  error?: ReactNode;
  onConfirm: () => void;
  /** Extra content between the description and the buttons, e.g. a list of what will be removed. */
  children?: ReactNode;
}

/**
 * Asks before doing something that cannot easily be undone. Radix gives it the focus trap, Esc and
 * focus return; the first focusable element is the close button, so pressing Enter right after it
 * opens can never confirm by accident. Cancel and confirm are both explicit.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = true,
  pending = false,
  error,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      size="sm"
      trigger={trigger}
      open={open}
      // A running action must finish before the dialog can go away; otherwise its outcome is invisible.
      onOpenChange={(next) => {
        if (!pending || next) onOpenChange(next);
      }}
      title={title}
      description={description}
      closeLabel="Close"
      footer={
        <>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            loading={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}
        {children}
      </div>
    </Modal>
  );
}
