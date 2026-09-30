"use client";

import { CircleAlert } from "lucide-react";
import { useId, type RefObject } from "react";

export interface ErrorSummaryItem {
  /** The id of the field's control, so the link can move focus to it. */
  id: string;
  label: string;
  message: string;
}

/**
 * The list of problems after a failed submit. It takes focus (hence tabIndex -1) so a screen
 * reader announces the title and the whole list at once; each entry then moves focus to its field.
 * Rendered only while there is something to fix.
 */
export function FormErrorSummary({
  title,
  items,
  ref,
}: {
  title: string;
  items: readonly ErrorSummaryItem[];
  ref: RefObject<HTMLDivElement | null>;
}) {
  const headingId = useId();
  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-labelledby={headingId}
      className="rounded-lg border border-danger-600/25 bg-danger-50 p-4 sm:p-5"
    >
      <h2 id={headingId} className="flex items-center gap-2 text-label text-danger-600">
        <CircleAlert aria-hidden className="size-5 shrink-0" />
        {title}
      </h2>
      <ul className="mt-3 grid gap-1 ps-7">
        {items.map((item) => (
          <li key={item.id} className="list-disc text-small">
            <a
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(item.id)?.focus();
              }}
              className="inline-block py-1 text-ink underline underline-offset-4 hover:text-danger-600"
            >
              {item.label}: {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
