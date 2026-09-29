import type { MetadataRoute } from "next";
import { ADMIN_PATH_PREFIX } from "@/config/routes";
import { isSiteUrlConfigured } from "@/config/site";
import { absoluteUrl } from "@/lib/seo/urls";

export default function robots(): MetadataRoute.Robots {
  // Same rule as the layout's noindex: a deployment without a real domain must never be crawled.
  if (!isSiteUrlConfigured()) return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: { userAgent: "*", allow: "/", disallow: [ADMIN_PATH_PREFIX, "/api", "/files"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
