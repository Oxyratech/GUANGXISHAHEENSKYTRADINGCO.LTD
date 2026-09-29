import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Honest empty state: says what is missing and, when useful, what to do next. `icon` is decorative
 * (e.g. <Icon name="PackageSearch" />). `titleAs` sets the heading level to fit the page outline.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  titleAs: Title = "h3",
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-5 px-6 py-14 text-center", className)}>
      {icon ? (
        <div
          aria-hidden
          className="grid size-12 place-items-center rounded-lg border border-line bg-surface text-navy-700 [&_svg]:size-6"
        >
          {icon}
        </div>
      ) : null}
      <div className="grid max-w-md gap-2">
        <Title className="text-h3 text-navy-900">{title}</Title>
        {description ? <p className="text-body text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
