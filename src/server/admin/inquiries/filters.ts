import { isCountryCode } from "@/lib/countries";
import { isInquiryStatus, type InquiryStatus } from "@/lib/domain/statuses";
import { isCategorySlug, type CategorySlug } from "@/content/categories";
import type { RawSearchParams } from "@/server/admin/pagination";

/*
 * The inquiries list is entirely URL-driven (bookmarkable, works without JavaScript): every filter,
 * the sort order and the page all live in the query string. This module turns that raw, untrusted
 * query string into a typed, validated shape. Anything malformed quietly falls back to "no filter"
 * rather than erroring the page.
 */

export const INQUIRY_SORTS = ["newest", "oldest", "status"] as const;
export type InquirySort = (typeof INQUIRY_SORTS)[number];

export interface InquiryListFilters {
  q: string;
  status: InquiryStatus | "";
  category: CategorySlug | "";
  country: string;
  assignee: string;
  /** Inclusive calendar day, "" when not set. */
  from: string;
  to: string;
  sort: InquirySort;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

/** GUID-shaped strings only; anything else can never be an assignee id. */
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseInquiryListFilters(searchParams: RawSearchParams): InquiryListFilters {
  const status = first(searchParams.status).toUpperCase();
  const category = first(searchParams.category).toLowerCase();
  const country = first(searchParams.country).toUpperCase();
  const assignee = first(searchParams.assignee);
  const from = first(searchParams.from);
  const to = first(searchParams.to);
  const sort = first(searchParams.sort);

  return {
    q: first(searchParams.q).slice(0, 200),
    status: isInquiryStatus(status) ? status : "",
    category: isCategorySlug(category) ? category : "",
    country: isCountryCode(country) ? country : "",
    assignee: assignee === "unassigned" || GUID.test(assignee) ? assignee : "",
    from: isIsoDate(from) ? from : "",
    to: isIsoDate(to) ? to : "",
    sort: (INQUIRY_SORTS as readonly string[]).includes(sort) ? (sort as InquirySort) : "newest",
  };
}

/** Calendar day `value` as a UTC instant, for `createdAt` range comparisons. */
export function startOfDayUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function endOfDayUtc(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}
