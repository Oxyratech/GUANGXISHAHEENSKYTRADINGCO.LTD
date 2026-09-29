import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { fieldControlStyles } from "./field-styles";

export function Textarea({ className, ref, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldControlStyles, "block min-h-32 resize-y px-3.5 py-2.5", className)}
      {...props}
    />
  );
}
