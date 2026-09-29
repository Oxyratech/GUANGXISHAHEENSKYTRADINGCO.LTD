"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Radix checkbox (supports "indeterminate"). It has no label of its own: put it in a <FormField
 * layout="inline"> or give it aria-label. The invisible ::after pads the hit area to 44px.
 */
export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "group relative size-5 shrink-0 rounded-sm border border-line-strong bg-white text-white transition-colors duration-150",
        "after:absolute after:-inset-3 after:content-['']",
        "hover:border-navy-600",
        "data-[state=checked]:border-navy-900 data-[state=checked]:bg-navy-900",
        "data-[state=indeterminate]:border-navy-900 data-[state=indeterminate]:bg-navy-900",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-danger-600",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check
          aria-hidden
          strokeWidth={3}
          className="size-3.5 group-data-[state=indeterminate]:hidden"
        />
        <Minus
          aria-hidden
          strokeWidth={3}
          className="hidden size-3.5 group-data-[state=indeterminate]:block"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
