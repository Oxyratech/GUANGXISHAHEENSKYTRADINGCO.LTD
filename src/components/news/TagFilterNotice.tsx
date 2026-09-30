import type { ReactNode } from "react";
import { SmartLink } from "@/components/ui/smart-link";
import { cn } from "@/lib/utils";

/**
 * Tells the reader the list is narrowed to one tag and offers the way back. Tags have no menu of
 * their own (they are reached from an article), so without this notice the filter would be
 * invisible.
 */
export function TagFilterNotice({
  notice,
  clearLabel,
  clearHref,
  className,
}: {
  /** Translated sentence with the tag name already emphasised. */
  notice: ReactNode;
  clearLabel: string;
  clearHref: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-lg border border-line bg-surface px-4 text-small text-ink-muted",
        className,
      )}
    >
      <p className="py-3">{notice}</p>
      <SmartLink
        href={clearHref}
        className="inline-flex min-h-11 items-center font-medium text-blue-700 underline underline-offset-4 hover:text-blue-800"
      >
        {clearLabel}
      </SmartLink>
    </div>
  );
}
