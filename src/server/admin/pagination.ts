/*
 * Offset pagination driven by the URL, so every list page is linkable, back-button friendly and works
 * without JavaScript. Pure and free of `server-only` (the admin components import the types).
 */

/** What a Next.js page receives from `await searchParams`. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PageMeta {
  total: number;
  /** The page being shown, clamped into 1..pageCount. */
  page: number;
  pageSize: number;
  /** At least 1, even for an empty result. */
  pageCount: number;
  /** 1-based position of the first and last row shown; both 0 when there are no rows. */
  from: number;
  to: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
/** Keeps `skip` far below the 32-bit limit of SQL Server's OFFSET arithmetic in Prisma. */
const MAX_PAGE = 100_000;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(raw: string | undefined): number | null {
  if (raw === undefined || !/^\d{1,9}$/.test(raw.trim())) return null;
  const value = Number(raw);
  return value >= 1 ? value : null;
}

/** Reads `page` and `pageSize` from the query string; anything malformed falls back to a default. */
export function parsePageParams(
  searchParams: RawSearchParams,
  options: { defaultPageSize?: number; maxPageSize?: number } = {},
): PageParams {
  const maxPageSize = options.maxPageSize ?? MAX_PAGE_SIZE;
  const defaultPageSize = Math.min(options.defaultPageSize ?? DEFAULT_PAGE_SIZE, maxPageSize);

  const page = Math.min(positiveInt(firstValue(searchParams.page)) ?? 1, MAX_PAGE);
  const pageSize = Math.min(
    positiveInt(firstValue(searchParams.pageSize)) ?? defaultPageSize,
    maxPageSize,
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPageMeta(total: number, page: number, pageSize: number): PageMeta {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(safeTotal / safeSize));
  const current = Math.min(Math.max(1, Math.floor(page)), pageCount);

  return {
    total: safeTotal,
    page: current,
    pageSize: safeSize,
    pageCount,
    from: safeTotal === 0 ? 0 : (current - 1) * safeSize + 1,
    to: Math.min(safeTotal, current * safeSize),
    hasPrevious: current > 1,
    hasNext: current < pageCount,
  };
}

/**
 * The same query string with `page` replaced (page 1 carries no `page` key, so the canonical URL
 * of a list stays clean). Every other parameter is preserved, repeated keys included.
 */
export function buildPageHref(
  pathname: string,
  searchParams: RawSearchParams,
  page: number,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  if (page > 1) query.set("page", String(page));
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}
