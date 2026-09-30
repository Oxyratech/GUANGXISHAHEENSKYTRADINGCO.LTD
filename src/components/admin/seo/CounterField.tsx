"use client";

import { useState } from "react";
import { ActionField } from "@/components/admin/ActionField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * A title/description field with a live character counter against a recommended length: green under
 * it, amber past it (still saved — the recommendation is not a hard rule), and the hint always states
 * the hard database limit the server itself enforces.
 */
export function CounterField({
  name,
  label,
  defaultValue,
  recommended,
  max,
  multiline = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  /** Length search engines typically show in full; past it, text may be truncated in results. */
  recommended: number;
  /** The database column's own limit. */
  max: number;
  multiline?: boolean;
}) {
  const [length, setLength] = useState(defaultValue.length);
  const overRecommended = length > recommended;
  const Control = multiline ? Textarea : Input;

  return (
    <ActionField
      name={name}
      label={label}
      hint={
        <span aria-live="polite" className={cn(overRecommended && "text-warning-600")}>
          {length} / {recommended} characters recommended (up to {max} saved)
        </span>
      }
    >
      <Control
        defaultValue={defaultValue}
        maxLength={max}
        onChange={(event) => setLength(event.target.value.length)}
      />
    </ActionField>
  );
}
