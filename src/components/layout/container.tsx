import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  narrow: "max-w-3xl", // 768px: long-form reading, forms
  default: "max-w-[1240px]",
  wide: "max-w-[1440px]",
} as const;

export type ContainerSize = keyof typeof SIZES;

/**
 * Horizontal page frame: centred, capped width, gutters of 16px (mobile), 24px (sm) and 32px (lg).
 * Sections are full-bleed bands; put a Container inside each one (PageHero brings its own).
 */
export function Container<T extends ElementType = "div">({
  as,
  size = "default",
  className,
  ...props
}: { as?: T; size?: ContainerSize } & Omit<ComponentProps<T>, "as" | "size">) {
  const Tag: ElementType = as ?? "div";
  return (
    <Tag className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", SIZES[size], className)} {...props} />
  );
}
