import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

/**
 * Eyebrow + title + description block that opens a section. Pick `as` so the page outline stays
 * valid (one h1 per page, normally supplied by PageHero; sections use h2, sub-sections h3). Pass
 * `id` and point the Section's aria-labelledby at it. Colours adapt inside <Section tone="navy">.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "start",
  as: Title = "h2",
  id,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "start" | "center";
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div className={cn("grid max-w-3xl gap-4", centered && "mx-auto text-center", className)}>
      {eyebrow ? <Eyebrow centered={centered}>{eyebrow}</Eyebrow> : null}
      <Title id={id} className="text-h2 text-navy-900 group-data-[tone=navy]/tone:text-white">
        {title}
      </Title>
      {description ? (
        <p className="text-body-lg text-ink-muted group-data-[tone=navy]/tone:text-blue-100">
          {description}
        </p>
      ) : null}
    </div>
  );
}
