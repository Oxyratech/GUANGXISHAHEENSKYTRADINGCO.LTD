"use client";

import { Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Check } from "@/components/icons";
import { Button } from "@/components/ui/button";

type CopyStatus = "idle" | "copied" | "failed";

const RESET_AFTER_MS = 4000;

export interface CopyButtonProps {
  /** Text placed on the clipboard. */
  value: string;
  /** Visible and accessible name of the button, e.g. "Copy code". */
  label: string;
  /** Visible label while the value is on the clipboard, e.g. "Copied". */
  copiedLabel: string;
  /** Sentence announced to screen readers after copying: it says what was copied. */
  announcement: string;
  /** Shown and announced when the browser refuses the copy. */
  failedLabel: string;
}

/**
 * Copies a value to the clipboard and says so: the button label changes and a polite live region
 * announces the result. The live region is always mounted, so assistive technology reliably picks
 * up the change. Without clipboard access (insecure context, permission denied) it says so and
 * leaves the value selectable in place.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  announcement,
  failedLabel,
}: CopyButtonProps) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    let next: CopyStatus = "failed";
    try {
      await navigator.clipboard.writeText(value);
      next = "copied";
    } catch {
      // No clipboard API or permission refused: report it below instead of pretending.
    }
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), RESET_AFTER_MS);
  }

  const copied = status === "copied";

  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? copiedLabel : label}
      </Button>
      <span
        role="status"
        className={status === "failed" ? "text-caption text-danger-600" : "sr-only"}
      >
        {copied ? announcement : status === "failed" ? failedLabel : ""}
      </span>
    </span>
  );
}
