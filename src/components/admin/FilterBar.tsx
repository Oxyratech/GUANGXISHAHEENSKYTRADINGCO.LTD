import Form from "next/form";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RawSearchParams } from "@/server/admin/pagination";
import { AdminLink } from "./AdminLink";

function toPairs(searchParams: RawSearchParams, skip: ReadonlySet<string>): [string, string][] {
  const pairs: [string, string][] = [];
  for (const [key, value] of Object.entries(searchParams)) {
    if (skip.has(key) || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) pairs.push([key, item]);
  }
  return pairs;
}

/**
 * The filter row above a list: a plain GET form, so a filtered list is a URL that can be bookmarked,
 * shared and reloaded, and it works without JavaScript. Put the controls (search box, selects) inside
 * as children, each with a `name` listed in `filterKeys` and its current value as `defaultValue`.
 *
 * Applying a filter always returns to page 1 (`page` is never carried over). Parameters that are not
 * filters (sort order, page size) ride along as hidden inputs, and "Reset" clears only the filters.
 */
export function FilterBar({
  pathname,
  searchParams,
  filterKeys,
  children,
  label = "Filters",
  submitLabel = "Apply",
  className,
}: {
  pathname: string;
  searchParams: RawSearchParams;
  /** The `name`s of the controls in `children`. */
  filterKeys: readonly string[];
  children: ReactNode;
  /** Accessible name of the search region, e.g. "Filter inquiries". */
  label?: string;
  submitLabel?: string;
  className?: string;
}) {
  const carried = toPairs(searchParams, new Set(["page", ...filterKeys]));
  const active = filterKeys.some((key) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value : [value]).some(
      (item) => item !== undefined && item !== "",
    );
  });
  const resetQuery = new URLSearchParams(carried).toString();

  return (
    <Form
      action={pathname}
      prefetch={false}
      role="search"
      aria-label={label}
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-3 shadow-card",
        className,
      )}
    >
      {carried.map(([key, value], index) => (
        <input key={`${key}-${index}`} type="hidden" name={key} value={value} />
      ))}
      {children}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm">
          {submitLabel}
        </Button>
        {active ? (
          <AdminLink
            href={resetQuery ? `${pathname}?${resetQuery}` : pathname}
            className="text-small"
          >
            Reset filters
          </AdminLink>
        ) : null}
      </div>
    </Form>
  );
}
