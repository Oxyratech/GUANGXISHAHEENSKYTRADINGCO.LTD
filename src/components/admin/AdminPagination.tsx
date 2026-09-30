import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { buildPageHref, type PageMeta, type RawSearchParams } from "@/server/admin/pagination";

/**
 * "Showing 21-40 of 132 inquiries" and the page links. Every link keeps the current filters and sort
 * (only `page` changes), so paging never loses the query. Nothing renders for an empty list: the
 * page shows its own empty state.
 */
export function AdminPagination({
  meta,
  pathname,
  searchParams,
  itemLabel = "results",
  className,
}: {
  meta: PageMeta;
  pathname: string;
  searchParams: RawSearchParams;
  /** Plural noun for the summary: "inquiries", "products". */
  itemLabel?: string;
  className?: string;
}) {
  if (meta.total === 0) return null;

  return (
    <div
      className={cn("flex flex-col items-center gap-3 sm:flex-row sm:justify-between", className)}
    >
      <p className="text-small text-ink-muted tabular-nums">
        Showing {meta.from.toLocaleString("en-US")}&ndash;{meta.to.toLocaleString("en-US")} of{" "}
        {meta.total.toLocaleString("en-US")} {itemLabel}
      </p>
      <Pagination
        page={meta.page}
        pageCount={meta.pageCount}
        getHref={(page) => buildPageHref(pathname, searchParams, page)}
        label="Pagination"
        previousLabel="Previous"
        nextLabel="Next"
        getPageLabel={(page) => `Page ${page}`}
      />
    </div>
  );
}
