import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Our type scale (globals.css `@utility text-*`) sets font-size and line-height. tailwind-merge does
 * not know these names, files them under text *colour* and silently drops one of `text-h3` /
 * `text-ink-muted` when both are present. Registering them as font-size utilities fixes that.
 */
const TYPE_SCALE = [
  "display",
  "h1",
  "h2",
  "h3",
  "body-lg",
  "body",
  "small",
  "caption",
  "label",
  "button",
  "eyebrow",
];

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: TYPE_SCALE }] } },
});

/** Merge conditional class names, resolving Tailwind conflicts (type-scale aware). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
