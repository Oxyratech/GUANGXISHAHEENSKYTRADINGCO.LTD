import Link from "next/link";
import { INQUIRY_STATUS_DEFINITIONS, type InquiryStatus } from "@/lib/domain/statuses";
import { cn } from "@/lib/utils";
import type { StatusCount } from "@/server/admin/dashboard/status-counts";
import type { RawSearchParams } from "@/server/admin/pagination";

const LABELS = new Map<string, string>(
  INQUIRY_STATUS_DEFINITIONS.map((status) => [status.code, status.label]),
);

/** The current query string with `status` replaced and `page` dropped (a new tab starts at page 1). */
function hrefFor(pathname: string, searchParams: RawSearchParams, status: string): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "status" || key === "page" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  if (status) query.set("status", status);
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/**
 * Status filter as tabs, each carrying its own count. Plain links (bookmarkable, work without
 * JavaScript), styled like the segmented-control look of the shared Tabs component.
 */
export function InquiryStatusTabs({
  pathname,
  searchParams,
  counts,
  total,
  active,
}: {
  pathname: string;
  searchParams: RawSearchParams;
  counts: readonly StatusCount[];
  total: number;
  active: InquiryStatus | "";
}) {
  const tabs: { key: InquiryStatus | ""; label: string; count: number }[] = [
    { key: "", label: "All", count: total },
    ...counts.map((entry) => ({
      key: entry.status as InquiryStatus,
      label: LABELS.get(entry.status) ?? entry.status,
      count: entry.count,
    })),
  ];

  return (
    <nav aria-label="Filter inquiries by status" className="-mx-1 overflow-x-auto px-1 pb-1">
      <ul className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key || "all"}>
              <Link
                href={hrefFor(pathname, searchParams, tab.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-md px-4 text-label whitespace-nowrap transition-colors duration-150",
                  isActive
                    ? "bg-white text-navy-900 shadow-card"
                    : "text-ink-muted hover:text-navy-900",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "text-caption tabular-nums",
                    isActive ? "text-ink-muted" : "text-ink-subtle",
                  )}
                >
                  {tab.count.toLocaleString("en-US")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
