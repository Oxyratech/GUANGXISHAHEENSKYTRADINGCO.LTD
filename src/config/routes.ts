import { SERVICE_SLUGS } from "@/content/services";

/**
 * Static public pathnames (locale prefix excluded). Dynamic pages — /products/[category],
 * /products/[category]/[product] and /news/[slug] — are enumerated separately (sitemap builds them
 * from the category registry and the database).
 *
 * Add a page here and it is picked up by the sitemap, hreflang alternates and route tests.
 */
export const STATIC_PUBLIC_PATHS = [
  "/",
  "/about",
  "/business",
  ...SERVICE_SLUGS.map((slug) => `/business/${slug}` as const),
  "/products",
  "/global-trade",
  "/global-trade/how-it-works",
  "/company-information",
  "/news",
  "/faq",
  "/contact",
  "/inquiry",
  "/privacy-policy",
  "/terms",
  "/cookies",
] as const;

export type StaticPublicPath = (typeof STATIC_PUBLIC_PATHS)[number];

/** Prefixes that are never localised and never indexed. */
export const ADMIN_PATH_PREFIX = "/admin";
