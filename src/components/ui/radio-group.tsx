"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useUiDirection } from "./direction";
import { Label } from "./label";

/**
 * Radix radio group. Wrap it in <FormField layout="group" label="…"> for the group's name, hint and
 * error. Arrow keys follow the reading direction (mirrored in RTL).
 */
export function RadioGroup({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      dir={useUiDirection()}
      className={cn("grid gap-0.5", className)}
      {...props}
    />
  );
}

type RadioGroupItemProps = Omit<ComponentProps<typeof RadioGroupPrimitive.Item>, "children"> & {
  /** Required: an unlabeled radio is inaccessible. */
  label: ReactNode;
  description?: ReactNode;
};

/** One option: radio + clickable label (+ optional description), with a 44px-tall row. */
export function RadioGroupItem({
  label,
  description,
  className,
  id,
  ...props
}: RadioGroupItemProps) {
  const autoId = useId();
  const itemId = id ?? autoId;
  const descriptionId = `${itemId}-description`;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="flex h-[1lh] shrink-0 items-center text-body">
        <RadioGroupPrimitive.Item
          id={itemId}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            "relative size-5 rounded-full border border-line-strong bg-white transition-colors duration-150",
            "after:absolute after:-inset-3 after:rounded-full after:content-['']",
            "hover:border-navy-600",
            "data-[state=checked]:border-navy-900",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "aria-[invalid=true]:border-danger-600",
            className,
          )}
          {...props}
        >
          <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
            <span className="block size-2.5 rounded-full bg-navy-900" />
          </RadioGroupPrimitive.Indicator>
        </RadioGroupPrimitive.Item>
      </span>
      <div className="grid gap-0.5">
        <Label htmlFor={itemId} className="text-body font-normal">
          {label}
        </Label>
        {description ? (
          <p id={descriptionId} className="text-small text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
