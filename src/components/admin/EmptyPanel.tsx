import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/**
 * "Nothing here yet", said honestly: what is missing and, when there is something to do, what to do
 * next. Used when a list has no rows or a section has no data; it never shows sample content.
 */
export function EmptyPanel({
  title,
  description,
  icon,
  action,
  titleAs = "h2",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-dashed border-line-strong bg-white", className)}>
      <EmptyState
        title={title}
        description={description}
        icon={icon}
        action={action}
        titleAs={titleAs}
        className="py-10"
      />
    </div>
  );
}
