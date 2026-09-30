"use client";

import type { ReactNode, Ref } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";

/**
 * The required privacy consent: one checkbox whose label links to the privacy policy. Consent is
 * never pre-ticked. The state lives in the parent form (through a Controller), so this stays a
 * plain controlled checkbox with the form field wiring around it.
 */
export function ConsentField({
  id,
  name,
  label,
  checked,
  onCheckedChange,
  onBlur,
  error,
  ref,
}: {
  id: string;
  name: string;
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onBlur: () => void;
  error?: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <FormField layout="inline" id={id} label={label} error={error} required>
      {(control) => (
        <Checkbox
          {...control}
          ref={ref}
          name={name}
          checked={checked}
          onCheckedChange={(next) => onCheckedChange(next === true)}
          onBlur={onBlur}
        />
      )}
    </FormField>
  );
}
