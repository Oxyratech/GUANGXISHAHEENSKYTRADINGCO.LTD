import type { ComponentProps, ElementType } from "react";

/** Content for screen readers only (skip links' targets, icon-button names, extra context). */
export function VisuallyHidden<T extends ElementType = "span">({
  as,
  ...props
}: { as?: T } & Omit<ComponentProps<T>, "as" | "className">) {
  const Tag: ElementType = as ?? "span";
  return <Tag className="sr-only" {...props} />;
}
