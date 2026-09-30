"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * The submit button of a form. While the form's action runs it shows a spinner and swallows clicks
 * but keeps focus (a disabled button would drop out of the tab order mid-submit). Must sit inside
 * the <form>.
 */
export function ActionSubmit({
  children = "Save",
  pendingLabel,
  variant,
  size,
  className,
}: {
  children?: ReactNode;
  /** Replaces the label while pending, e.g. "Saving...". */
  pendingLabel?: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} loading={pending}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
