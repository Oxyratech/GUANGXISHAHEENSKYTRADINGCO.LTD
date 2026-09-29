import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  default: "bg-white text-ink",
  muted: "bg-surface text-ink",
  navy: "bg-navy-900 text-white",
} as const;

const SPACING = {
  default: "py-16 md:py-24",
  compact: "py-10 md:py-14",
} as const;

export type SectionTone = keyof typeof TONES;

/**
 * Full-bleed band with the site's vertical rhythm (py-16, py-24 from md). It does NOT add a
 * Container: place <Container> inside. Give it `aria-labelledby` (the id of its heading) to make it
 * a named region. Inside a navy section, SectionHeading and Breadcrumb switch to light text on
 * their own through the `data-tone` hook (group/tone).
 */
export function Section({
  tone = "default",
  spacing = "default",
  className,
  ...props
}: ComponentProps<"section"> & { tone?: SectionTone; spacing?: keyof typeof SPACING }) {
  return (
    <section
      data-tone={tone}
      className={cn("group/tone", TONES[tone], SPACING[spacing], className)}
      {...props}
    />
  );
}
