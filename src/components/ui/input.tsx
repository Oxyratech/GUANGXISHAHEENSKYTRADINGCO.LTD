import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { fieldControlStyles } from "./field-styles";

/** Text-entry input, 44px tall, 16px text (no iOS zoom). Also styles type="file". */
export function Input({ className, type = "text", ref, ...props }: ComponentProps<"input">) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        fieldControlStyles,
        "h-11 px-3.5",
        "file:me-3 file:cursor-pointer file:border-0 file:bg-transparent file:p-0 file:text-label file:text-navy-900",
        type === "file" && "cursor-pointer py-2.5",
        className,
      )}
      {...props}
    />
  );
}
