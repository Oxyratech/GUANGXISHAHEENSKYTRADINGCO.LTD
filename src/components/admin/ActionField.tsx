"use client";

import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { FormField, type FormControlProps, type FormFieldProps } from "@/components/ui/form-field";
import { useActionForm } from "./ActionForm";

/**
 * A FormField that shows the server's validation message for `name`. The message is wired to the
 * control with aria-describedby / aria-invalid (by FormField), so screen readers announce it and
 * ActionForm can move focus to the first invalid control.
 *
 *   <ActionField name="title" label="Title" required>
 *     <Input defaultValue={product.title} maxLength={200} />
 *   </ActionField>
 *
 * When the child is an element without a `name`, `name` is added to it.
 */
export function ActionField({
  name,
  children,
  ...field
}: Omit<FormFieldProps, "error" | "children"> & {
  name: string;
  children: ReactElement | ((control: FormControlProps) => ReactNode);
}) {
  const { fieldErrors } = useActionForm();
  const error = fieldErrors[name]?.join(" ");

  const control =
    typeof children !== "function" &&
    isValidElement<{ name?: string }>(children) &&
    !children.props.name
      ? cloneElement(children, { name })
      : children;

  return (
    <FormField {...field} error={error}>
      {control}
    </FormField>
  );
}
