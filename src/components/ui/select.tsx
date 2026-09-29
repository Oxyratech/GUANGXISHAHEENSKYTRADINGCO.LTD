import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { fieldControlStyles } from "./field-styles";

/**
 * Styled native <select> (best for forms: mobile pickers, SSR, autofill, screen readers). Single
 * choice only. Provide the empty option yourself, e.g. <option value="">Select…</option>.
 * `className` styles the <select>; `wrapperClassName` the positioning wrapper.
 */
export function Select({
  className,
  wrapperClassName,
  children,
  ref,
  ...props
}: ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          fieldControlStyles,
          "h-11 cursor-pointer appearance-none ps-3.5 pe-10",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
      />
    </div>
  );
}
