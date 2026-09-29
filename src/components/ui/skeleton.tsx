import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Static placeholder block for content that is loading (deliberately not animated). It is hidden
 * from assistive tech: give the loading region aria-busy and a <Spinner label="…"> or a
 * VisuallyHidden status so screen readers hear about the loading state once.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("rounded-md bg-surface-2", className)} {...props} />;
}
