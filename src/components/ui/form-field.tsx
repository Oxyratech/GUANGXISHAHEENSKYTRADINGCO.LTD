/*
 * FormField composes label + control + hint + error and does all the ARIA wiring, so individual
 * controls never hand-roll it.
 *
 *   <FormField label={t("email")} hint={t("emailHint")} error={errors.email?.message} required>
 *     <Input type="email" autoComplete="email" {...register("email")} />
 *   </FormField>
 *
 * The child receives id, aria-describedby (hint + error), aria-invalid and aria-required. Pass a
 * render function instead of an element when the control is not the direct child:
 *   <FormField label="…">{(control) => <Wrapper><Input {...control} /></Wrapper>}</FormField>
 *
 * layout:
 *   "stacked" (default)  label above a text control (Input, Textarea, Select)
 *   "inline"             control beside its label: a single Checkbox
 *   "group"              <fieldset>/<legend> around a RadioGroup or several checkboxes; the child
 *                        receives aria-invalid/aria-required only, the fieldset carries the description
 *
 * The error region is always in the DOM and aria-live="polite", so an error that appears after
 * submit is announced; aria-describedby only references it while an error exists. The required
 * asterisk is decorative: assistive tech gets aria-required.
 */
import { CircleAlert } from "lucide-react";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

export interface FormControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
}

export interface FormFieldProps {
  label: ReactNode;
  children: ReactElement | ((control: FormControlProps) => ReactNode);
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  layout?: "stacked" | "inline" | "group";
  className?: string;
  /** Base id for the control; generated when omitted. */
  id?: string;
}

function joinIds(...ids: (string | false | null | undefined)[]): string | undefined {
  const joined = ids.filter(Boolean).join(" ");
  return joined || undefined;
}

export function FormField({
  label,
  children,
  hint,
  error,
  required,
  layout = "stacked",
  className,
  id,
}: FormFieldProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const hasError = Boolean(error);
  const hasHint = Boolean(hint);
  const describedBy = joinIds(hasHint && hintId, hasError && errorId);

  const validity = {
    "aria-invalid": hasError ? (true as const) : undefined,
    "aria-required": required ? (true as const) : undefined,
  };
  const controlProps: FormControlProps =
    layout === "group"
      ? { id: controlId, ...validity }
      : { id: controlId, "aria-describedby": describedBy, ...validity };

  let control: ReactNode;
  if (typeof children === "function") {
    control = children(controlProps);
  } else if (isValidElement<Record<string, unknown>>(children)) {
    const existing = children.props["aria-describedby"];
    control = cloneElement(children, {
      ...controlProps,
      "aria-describedby": joinIds(
        controlProps["aria-describedby"],
        typeof existing === "string" && existing,
      ),
    });
  } else {
    control = children;
  }

  const labelContent = (
    <>
      {label}
      {required ? (
        <span aria-hidden className="ms-1 text-danger-600">
          *
        </span>
      ) : null}
    </>
  );
  const hintNode = hasHint ? (
    <p id={hintId} className="text-small text-ink-muted">
      {hint}
    </p>
  ) : null;
  // The live region stays mounted; `empty:` cancels the grid gap it would otherwise add.
  const errorNode = (indented: boolean) => (
    <div
      id={errorId}
      aria-live="polite"
      className={indented ? "ps-8 empty:-mt-1" : "empty:-mt-1.5"}
    >
      {hasError ? (
        <p className="flex items-start gap-1.5 text-small text-danger-600">
          <CircleAlert aria-hidden className="mt-[0.2em] size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );

  if (layout === "group") {
    return (
      <fieldset
        aria-describedby={describedBy}
        className={cn("m-0 grid min-w-0 gap-1.5 border-0 p-0", className)}
      >
        <legend className="mb-1.5 p-0 text-label text-ink">{labelContent}</legend>
        {hintNode}
        {control}
        {errorNode(false)}
      </fieldset>
    );
  }

  if (layout === "inline") {
    return (
      <div className={cn("grid gap-1", className)}>
        <div className="flex items-start gap-3 py-2.5">
          <span className="flex h-[1lh] shrink-0 items-center text-body">{control}</span>
          <Label htmlFor={controlId} className="text-body font-normal">
            {labelContent}
          </Label>
        </div>
        {hasHint ? <div className="-mt-1.5 ps-8">{hintNode}</div> : null}
        {errorNode(true)}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={controlId}>{labelContent}</Label>
      {hintNode}
      {control}
      {errorNode(false)}
    </div>
  );
}
