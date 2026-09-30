import { cn } from "@/lib/utils";
import { formatUtc, toValidDate, type DateInput } from "@/server/admin/format";

/**
 * A timestamp in UTC with the label "UTC" in the text. Despite the name it never converts to the
 * reader's zone: that would make the server render and the browser disagree (a hydration mismatch)
 * and leave two admins in different zones describing the same event with different clocks. The
 * exact ISO value is in the `datetime` attribute and the tooltip.
 */
export function LocalDateTime({
  value,
  dateOnly = false,
  className,
}: {
  value: DateInput;
  dateOnly?: boolean;
  className?: string;
}) {
  const date = toValidDate(value);
  if (!date) {
    return (
      <span className={cn("text-ink-subtle", className)}>
        <span aria-hidden>&mdash;</span>
        <span className="sr-only">No date</span>
      </span>
    );
  }

  const iso = date.toISOString();
  return (
    <time dateTime={iso} title={iso} className={cn("tabular-nums", className)}>
      {formatUtc(date, { dateOnly })}
    </time>
  );
}
