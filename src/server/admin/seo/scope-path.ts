import type { SeoScope } from "@/lib/domain/statuses";

/*
 * The URL segment for each scope under /admin/seo/<segment>/<refKey>, lower-case for a tidier
 * address than the database's upper-case scope value. Free of `server-only`: components need it too.
 */
const SCOPE_TO_SLUG: Record<SeoScope, string> = {
  PAGE: "page",
  CATEGORY: "category",
  PRODUCT: "product",
  NEWS: "news",
};

const SLUG_TO_SCOPE: Record<string, SeoScope> = {
  page: "PAGE",
  category: "CATEGORY",
  product: "PRODUCT",
  news: "NEWS",
};

export function scopeSlug(scope: SeoScope): string {
  return SCOPE_TO_SLUG[scope];
}

export function scopeFromSlug(slug: string): SeoScope | null {
  return SLUG_TO_SCOPE[slug] ?? null;
}
