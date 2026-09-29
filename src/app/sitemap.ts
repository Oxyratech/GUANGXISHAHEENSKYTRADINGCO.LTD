import type { MetadataRoute } from "next";
import { getDynamicSitemapEntries } from "@/lib/seo/sitemap-dynamic";
import { buildStaticSitemapEntries } from "@/lib/seo/sitemap-static";

/**
 * Regenerated hourly. A build made without database access still succeeds (the dynamic part is then
 * empty) and picks up products and news on the first regeneration afterwards.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [...buildStaticSitemapEntries(), ...(await getDynamicSitemapEntries())];
}
