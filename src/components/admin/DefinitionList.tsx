import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DefinitionItem {
  label: ReactNode;
  /** A missing value (null, undefined, empty string) renders as a dash, announced as "Not provided". */
  value: ReactNode;
  /** Spans every column: for long text such as a message or an address. */
  wide?: boolean;
}

const COLUMNS = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
} as const;

function isMissing(value: ReactNode): boolean {
  return value === null || value === undefined || value === "" || value === false;
}

/** Label/value pairs as a real <dl>: the way to show a record's details. */
export function DefinitionList({
  items,
  columns = 2,
  className,
}: {
  items: readonly DefinitionItem[];
  columns?: keyof typeof COLUMNS;
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", COLUMNS[columns], className)}>
      {items.map((item, index) => (
        <div
          // Labels are ReactNodes and may repeat; the position is the stable identity here.
          key={index}
          className={cn("min-w-0", item.wide && "sm:col-span-full")}
        >
          <dt className="text-caption text-ink-muted">{item.label}</dt>
          <dd className="mt-0.5 text-small break-words text-ink">
            {isMissing(item.value) ? (
              <span className="text-ink-subtle">
                <span aria-hidden>&mdash;</span>
                <span className="sr-only">Not provided</span>
              </span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
