"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "failed";

const RESET_AFTER_MS = 2500;

/**
 * A value people copy (a reference code, an email, an id) with a button beside it. The result is
 * written out as text ("Copied" / "Copy failed") in a status region, not only shown by an icon.
 * Clipboard access needs a secure context and can be refused, in which case the value stays
 * selectable and the failure is said out loud.
 */
export function CopyValue({
  value,
  label,
  mono = true,
  className,
}: {
  value: string;
  /** What is being copied, for the button's name: "reference code". */
  label: string;
  mono?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    let next: CopyState = "copied";
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      next = "failed";
    }
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), RESET_AFTER_MS);
  }

  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5", className)}>
      <span className={cn("min-w-0 break-all", mono && "font-mono text-small")}>{value}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-surface-2 hover:text-navy-900"
      >
        {state === "copied" ? (
          <Check aria-hidden className="size-4 text-success-600" />
        ) : (
          <Copy aria-hidden className="size-4" />
        )}
      </button>
      <span
        role="status"
        className={cn("text-caption", state === "failed" ? "text-danger-600" : "text-success-600")}
      >
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : null}
      </span>
    </span>
  );
}
