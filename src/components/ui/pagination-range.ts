export type PaginationItem = number | "gap";

const SLOTS = 7; // first, last, current, one neighbour each side, two gaps
const EDGE_RUN = 5; // pages shown next to an edge when only the other side has a gap

/**
 * Pages to show for `page` of `pageCount`: always the first and last page, the current page with
 * one neighbour on each side, and "gap" where pages are skipped. The result has a constant length
 * (7) once there are more than 7 pages, so the control does not jump while paging.
 */
export function getPaginationRange(page: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 0) return [];
  if (pageCount <= SLOTS) return range(1, pageCount);

  const current = Math.min(Math.max(page, 1), pageCount);
  const left = Math.max(current - 1, 1);
  const right = Math.min(current + 1, pageCount);
  const showLeftGap = left > 3;
  const showRightGap = right < pageCount - 2;

  if (!showLeftGap) return [...range(1, EDGE_RUN), "gap", pageCount];
  if (!showRightGap) return [1, "gap", ...range(pageCount - EDGE_RUN + 1, pageCount)];
  return [1, "gap", ...range(left, right), "gap", pageCount];
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
