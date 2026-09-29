import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Plain <label>. Prefer <FormField>, which wires label, hint and error to the control. */
export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-label text-ink", className)} {...props} />;
}
