import { isCategorySlug, type CategorySlug } from "@/content/categories";
import type { PublishStatus } from "@/lib/domain/statuses";
import type { RawSearchParams } from "@/server/admin/pagination";
import { isPublishStatus } from "./schemas";

/*
 * The products list is entirely URL-driven, like the inquiries list (see
 * server/admin/inquiries/filters.ts): every filter and the sort order live in the query string, and
 * anything malformed quietly falls back to "no filter" instead of erroring the page.
 */

export const PRODUCT_SORTS = ["updated", "name", "sortOrder"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export interface ProductListFilters {
  q: string;
  status: PublishStatus | "";
  category: CategorySlug | "";
  sort: ProductSort;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseProductListFilters(searchParams: RawSearchParams): ProductListFilters {
  const status = first(searchParams.status).toUpperCase();
  const category = first(searchParams.category).toLowerCase();
  const sort = first(searchParams.sort);

  return {
    q: first(searchParams.q).slice(0, 200),
    status: isPublishStatus(status) ? status : "",
    category: isCategorySlug(category) ? category : "",
    sort: (PRODUCT_SORTS as readonly string[]).includes(sort) ? (sort as ProductSort) : "updated",
  };
}
