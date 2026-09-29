/*
 * Link-based pagination (server-friendly, works without JS, crawlable). Every string comes in as a
 * prop: no hard-coded English. `getHref(page)` builds the URL of a page (keep filters in it).
 * The current page is a non-link span with aria-current="page"; a disabled previous/next is an
 * aria-disabled span, not a dead link. Renders nothing for a single page. Below the sm breakpoint
 * the numbered links collapse to a compact "3 / 12" between previous and next, so the control never
 * wraps on a phone.
 *
 *   <Pagination page={2} pageCount={9} getHref={(p) => `/news?page=${p}`} label={t("pagination")}
 *     previousLabel={t("previous")} nextLabel={t("next")} getPageLabel={(p) => t("page", { page: p })} />
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPaginationRange } from "./pagination-range";
import { SmartLink } from "./smart-link";

const itemStyles =
  "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-3 text-label tabular-nums";

export interface PaginationProps {
  page: number;
  pageCount: number;
  getHref: (page: number) => string;
  /** aria-label of the <nav>. */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** Accessible name for a page link, e.g. "Page 3". Defaults to the number itself. */
  getPageLabel?: (page: number) => string;
  className?: string;
}

export function Pagination({
  page,
  pageCount,
  getHref,
  label,
  previousLabel,
  nextLabel,
  getPageLabel,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;
  const current = Math.min(Math.max(page, 1), pageCount);
  const hasPrevious = current > 1;
  const hasNext = current < pageCount;

  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          {hasPrevious ? (
            <SmartLink
              href={getHref(current - 1)}
              rel="prev"
              className={cn(itemStyles, "text-navy-900 hover:bg-surface-2")}
            >
              <ChevronLeft aria-hidden className="rtl-flip size-4" />
              <span className="sr-only sm:not-sr-only">{previousLabel}</span>
            </SmartLink>
          ) : (
            <span
              aria-disabled="true"
              className={cn(itemStyles, "cursor-not-allowed text-ink-subtle opacity-60")}
            >
              <ChevronLeft aria-hidden className="rtl-flip size-4" />
              <span className="sr-only sm:not-sr-only">{previousLabel}</span>
            </span>
          )}
        </li>
        <li className="sm:hidden">
          <span
            aria-current="page"
            aria-label={getPageLabel?.(current)}
            className={cn(itemStyles, "px-2 text-navy-900")}
          >
            <bdi>
              {current} / {pageCount}
            </bdi>
          </span>
        </li>
        {getPaginationRange(current, pageCount).map((item, index) => (
          <li key={item === "gap" ? `gap-${index}` : item} className="hidden sm:block">
            {item === "gap" ? (
              <span aria-hidden className={cn(itemStyles, "text-ink-subtle")}>
                …
              </span>
            ) : item === current ? (
              <span
                aria-current="page"
                aria-label={getPageLabel?.(item)}
                className={cn(itemStyles, "bg-navy-900 text-white")}
              >
                {item}
              </span>
            ) : (
              <SmartLink
                href={getHref(item)}
                aria-label={getPageLabel?.(item)}
                className={cn(itemStyles, "text-navy-900 hover:bg-surface-2")}
              >
                {item}
              </SmartLink>
            )}
          </li>
        ))}
        <li>
          {hasNext ? (
            <SmartLink
              href={getHref(current + 1)}
              rel="next"
              className={cn(itemStyles, "text-navy-900 hover:bg-surface-2")}
            >
              <span className="sr-only sm:not-sr-only">{nextLabel}</span>
              <ChevronRight aria-hidden className="rtl-flip size-4" />
            </SmartLink>
          ) : (
            <span
              aria-disabled="true"
              className={cn(itemStyles, "cursor-not-allowed text-ink-subtle opacity-60")}
            >
              <span className="sr-only sm:not-sr-only">{nextLabel}</span>
              <ChevronRight aria-hidden className="rtl-flip size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
