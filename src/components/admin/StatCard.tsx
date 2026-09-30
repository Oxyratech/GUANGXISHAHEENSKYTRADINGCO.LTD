import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  default: "border-line bg-white",
  // Draws the eye to something waiting for a person, e.g. NEW inquiries. The label says what it is.
  highlight: "border-gold-400 bg-gold-50",
} as const;

/**
 * One number and what it counts. `value` is a real count from the database; the caller shows
 * nothing at all rather than a placeholder when it has no data. With `href` the whole card is one link
 * (a stretched link inside the label, so keyboard and screen-reader users get a single, named target).
 */
export function StatCard({
  label,
  value,
  description,
  tone = "default",
  href,
  className,
}: {
  label: string;
  value: number | string;
  description?: ReactNode;
  tone?: keyof typeof TONES;
  href?: string;
  className?: string;
}) {
  const shown = typeof value === "number" ? value.toLocaleString("en-US") : value;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded-lg border p-4 shadow-card",
        TONES[tone],
        href &&
          "transition-shadow duration-150 hover:shadow-raised has-[a:focus-visible]:shadow-raised",
        className,
      )}
    >
      <p className="text-label text-ink-muted">
        {href ? (
          <Link
            href={href}
            className="rounded-xs after:absolute after:inset-0 after:rounded-lg after:content-[''] hover:text-navy-900"
          >
            {label}
          </Link>
        ) : (
          label
        )}
      </p>
      <p className="text-h2 text-navy-900 tabular-nums">{shown}</p>
      {description ? <p className="text-caption text-ink-muted">{description}</p> : null}
    </div>
  );
}
