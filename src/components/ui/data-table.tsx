/*
 * DataTable: semantic, typed, presentational. It does not sort or page by itself; the caller passes
 * already-ordered `rows` and the active `sort`.
 *  - `caption` is required: it names the table and its scroll region.
 *  - Sortable columns render their header as a link (`getSortHref`, server-friendly, crawlable) or a
 *    button (`onSortChange`, needs a client parent). The <th> carries aria-sort; activating a header
 *    cycles asc -> desc -> asc.
 *  - `getRowKey` must return a stable unique id (never the array index).
 *  - `emptyState` fills the body when there are no rows (header and caption stay).
 *  - The wrapper scrolls horizontally on narrow screens and is a focusable region so keyboard users
 *    can scroll it.
 */
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SmartLink } from "./smart-link";

export type SortDirection = "asc" | "desc";

export interface DataTableSort {
  key: string;
  direction: SortDirection;
}

export interface DataTableColumn<T> {
  /** Stable id: React key and the value passed to the sort callbacks. */
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "start" | "center" | "end";
  /** Render this column's cells as row headers (<th scope="row">). Use it for the identifying column. */
  rowHeader?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  caption: ReactNode;
  hideCaption?: boolean;
  sort?: DataTableSort | null;
  getSortHref?: (key: string, direction: SortDirection) => string;
  onSortChange?: (key: string, direction: SortDirection) => void;
  emptyState?: ReactNode;
  className?: string;
}

const ALIGN = { start: "text-start", center: "text-center", end: "text-end" } as const;
const JUSTIFY = { start: "justify-start", center: "justify-center", end: "justify-end" } as const;
const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;
const SORT_ICON = { asc: ArrowUp, desc: ArrowDown } as const;

type SortProps = Pick<DataTableProps<unknown>, "sort" | "getSortHref" | "onSortChange">;

function ColumnHeader<T>({
  column,
  sort,
  getSortHref,
  onSortChange,
}: SortProps & { column: DataTableColumn<T> }) {
  const align = column.align ?? "start";
  const sortable = Boolean(column.sortable) && Boolean(getSortHref || onSortChange);
  const active = sortable && sort?.key === column.key;
  const direction = active ? sort?.direction : undefined;
  const nextDirection: SortDirection = direction === "asc" ? "desc" : "asc";

  const cellClass = cn("flex min-h-11 w-full items-center gap-1.5 px-4", JUSTIFY[align]);
  const SortIcon = direction ? SORT_ICON[direction] : ChevronsUpDown;
  const ariaSort = sortable ? (direction ? ARIA_SORT[direction] : "none") : undefined;

  let content: ReactNode = <div className={cellClass}>{column.header}</div>;
  if (sortable) {
    const inner = (
      <>
        {column.header}
        <SortIcon
          aria-hidden
          className={cn("size-4 shrink-0", active ? "text-navy-900" : "text-ink-subtle")}
        />
      </>
    );
    const controlClass = cn(cellClass, "hover:text-navy-900", active && "text-navy-900");
    content = getSortHref ? (
      <SmartLink href={getSortHref(column.key, nextDirection)} className={controlClass}>
        {inner}
      </SmartLink>
    ) : (
      <button
        type="button"
        onClick={() => onSortChange?.(column.key, nextDirection)}
        className={cn(controlClass, "cursor-pointer")}
      >
        {inner}
      </button>
    );
  }

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn("p-0 text-label whitespace-nowrap text-ink-muted", ALIGN[align])}
    >
      {content}
    </th>
  );
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  hideCaption = false,
  sort,
  getSortHref,
  onSortChange,
  emptyState,
  className,
}: DataTableProps<T>) {
  const captionId = useId();

  return (
    <div
      role="region"
      aria-labelledby={captionId}
      // Keyboard users can only scroll an overflowing region if it can take focus.
      tabIndex={0}
      className={cn("overflow-x-auto rounded-lg border border-line bg-white", className)}
    >
      <table className="w-full border-collapse text-small">
        <caption
          id={captionId}
          className={hideCaption ? "sr-only" : "px-4 py-3 text-start text-label text-ink"}
        >
          {caption}
        </caption>
        <thead>
          <tr className="border-y border-line bg-surface">
            {columns.map((column) => (
              <ColumnHeader
                key={column.key}
                column={column}
                sort={sort}
                getSortHref={getSortHref}
                onSortChange={onSortChange}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyState ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {emptyState}
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="border-b border-line last:border-b-0 hover:bg-surface/60"
            >
              {columns.map((column) => {
                const cellClass = cn(
                  "px-4 py-3.5 align-top",
                  ALIGN[column.align ?? "start"],
                  column.className,
                );
                return column.rowHeader ? (
                  <th
                    key={column.key}
                    scope="row"
                    className={cn(cellClass, "font-medium text-navy-900")}
                  >
                    {column.cell(row)}
                  </th>
                ) : (
                  <td key={column.key} className={cn(cellClass, "text-ink")}>
                    {column.cell(row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
