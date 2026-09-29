import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeStyles = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-caption font-medium",
  {
    variants: {
      variant: {
        neutral: "border-line bg-surface text-ink-muted",
        blue: "border-blue-200 bg-blue-50 text-blue-700",
        gold: "border-gold-200 bg-gold-50 text-gold-700",
        success: "border-success-600/25 bg-success-50 text-success-600",
        warning: "border-warning-700/25 bg-warning-50 text-warning-700",
        danger: "border-danger-600/25 bg-danger-50 text-danger-600",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeStyles>;

/** Small status/label chip. Colour is never the only signal: the text carries the meaning. */
export function Badge({ variant, className, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ variant }), className)} {...props} />;
}
