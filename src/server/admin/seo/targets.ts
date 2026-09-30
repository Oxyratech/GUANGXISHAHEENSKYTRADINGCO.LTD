import { STATIC_PUBLIC_PATHS } from "@/config/routes";
import { CATEGORIES } from "@/content/categories";
import type { SeoScope } from "@/lib/domain/statuses";
import { pageKeyFromPath } from "@/server/seo";

/*
 * The directory of overridable SEO targets. PAGE and CATEGORY targets are enumerable (the static
 * pathnames and the twelve registered categories), so they are listed in full; PRODUCT and NEWS
 * targets are looked up by search instead (see ./queries) because there can be many of them and they
 * change constantly. Free of `server-only`: the admin components read the plain arrays too.
 */

export interface SeoTarget {
  scope: SeoScope;
  refKey: string;
  label: string;
  /** Locale-less public path, for "view the page" links. */
  publicPath: string;
}

function titleCase(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

/** "business/international-trading" -> "Business – International trading". */
function labelFromPageKey(refKey: string): string {
  if (refKey === "home") return "Home";
  const parts = refKey.split("/").map((part, index) => (index === 0 ? titleCase(part) : titleCase(part)));
  return parts.join(" – ");
}

export const STATIC_SEO_TARGETS: readonly SeoTarget[] = STATIC_PUBLIC_PATHS.map((path) => {
  const refKey = pageKeyFromPath(path);
  return { scope: "PAGE", refKey, label: labelFromPageKey(refKey), publicPath: path };
});

export const CATEGORY_SEO_TARGETS: readonly SeoTarget[] = CATEGORIES.map((category) => ({
  scope: "CATEGORY",
  refKey: category.slug,
  label: titleCase(category.slug),
  publicPath: `/products/${category.slug}`,
}));

export function findStaticTarget(refKey: string): SeoTarget | undefined {
  return STATIC_SEO_TARGETS.find((target) => target.refKey === refKey);
}

export function findCategoryTarget(refKey: string): SeoTarget | undefined {
  return CATEGORY_SEO_TARGETS.find((target) => target.refKey === refKey);
}
