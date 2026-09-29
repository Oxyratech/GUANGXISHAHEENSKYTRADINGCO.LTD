"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import "./ui-motion.css";

export interface DialogShellProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (rendered as the Radix trigger). Omit for a controlled dialog. */
  trigger?: ReactNode;
  /** Required for accessibility: it names the dialog. Use hideTitle to keep it screen-reader only. */
  title: ReactNode;
  /** Required for accessibility: it describes the dialog. */
  description: ReactNode;
  hideTitle?: boolean;
  hideDescription?: boolean;
  /** Translated accessible name for the close button. */
  closeLabel: string;
  children?: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared frame of Modal and Drawer: overlay, focus-trapped content, header with close button,
 * scrollable body and footer. Radix provides the focus trap, Esc, scroll lock and focus return.
 */
export function DialogShell({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  hideTitle,
  hideDescription,
  closeLabel,
  children,
  footer,
  contentClassName,
  side,
}: DialogShellProps & { contentClassName: string; side?: "start" | "end" | "bottom" }) {
  return (
    <Dialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="ui-fade fixed inset-0 z-50 bg-navy-950/55" />
        <Dialog.Content
          data-side={side}
          className={cn(
            // Radix focuses the (non-interactive) panel itself; suppress the ring there, keep it on controls.
            "fixed z-50 flex flex-col bg-white shadow-raised focus-visible:outline-none!",
            side ? "ui-sheet" : "ui-pop",
            contentClassName,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="grid min-w-0 gap-1">
              <Dialog.Title className={cn("text-h3 text-navy-900", hideTitle && "sr-only")}>
                {title}
              </Dialog.Title>
              <Dialog.Description
                className={cn("text-small text-ink-muted", hideDescription && "sr-only")}
              >
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={closeLabel} className="-me-2 -mt-1.5">
                <X aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4 sm:px-6">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
