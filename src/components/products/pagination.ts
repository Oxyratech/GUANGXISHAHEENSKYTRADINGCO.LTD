/** Query parameter that carries the page number. */
export const PAGE_PARAM = "page";

/**
 * The page number from a `?page=` value: the first one when repeated, and 1 for anything that is not
 * a positive whole number (missing, "abc", "0", "-2", "1.5"). Never throws on hostile input.
 */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || !/^\d{1,6}$/.test(raw)) return 1;
  return Math.max(Number(raw), 1);
}

/** Address of a page of a listing. Page 1 is the plain path, so it has one canonical address. */
export function buildPageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?${PAGE_PARAM}=${page}`;
}
