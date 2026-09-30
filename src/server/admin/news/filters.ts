import { LOCALES, type Locale } from "@/i18n/locales";
import { PUBLISH_STATUSES, type PublishStatus } from "@/lib/domain/statuses";
import type { RawSearchParams } from "@/server/admin/pagination";

/*
 * The news list is entirely URL-driven, the same way the inquiries list is (see
 * @/server/admin/inquiries/filters): every filter and the sort order live in the query string, and
 * anything malformed quietly falls back to "no filter" rather than erroring the page.
 */

export const NEWS_SORTS = ["newest", "oldest", "title"] as const;
export type NewsSort = (typeof NEWS_SORTS)[number];

export interface NewsListFilters {
  q: string;
  locale: Locale | "";
  status: PublishStatus | "";
  /** A NewsCategory slug. Categories are admin-managed data, not a fixed registry, so any non-empty
   *  string is accepted here; an unknown slug simply matches nothing. */
  category: string;
  sort: NewsSort;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseNewsListFilters(searchParams: RawSearchParams): NewsListFilters {
  const locale = first(searchParams.locale).toLowerCase();
  const status = first(searchParams.status).toUpperCase();
  const sort = first(searchParams.sort);

  return {
    q: first(searchParams.q).slice(0, 200),
    locale: (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : "",
    status: (PUBLISH_STATUSES as readonly string[]).includes(status) ? (status as PublishStatus) : "",
    category: first(searchParams.category).slice(0, 80),
    sort: (NEWS_SORTS as readonly string[]).includes(sort) ? (sort as NewsSort) : "newest",
  };
}
