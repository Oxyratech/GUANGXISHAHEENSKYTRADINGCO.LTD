import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/components/brand/brand-geometry";
import { COMPANY } from "@/config/company";
import { SITE } from "@/config/site";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { COMPANY_DISPLAY_NAME } from "@/lib/seo/constants";
import { localizedPath } from "@/lib/seo/urls";

export default function manifest(): MetadataRoute.Manifest {
  const { cityEn, regionEn, countryEn } = COMPANY.location;
  return {
    name: COMPANY_DISPLAY_NAME,
    short_name: SITE.name,
    description: `International trading and product sourcing company registered in ${cityEn}, ${regionEn}, ${countryEn}.`,
    lang: DEFAULT_LOCALE,
    start_url: localizedPath(DEFAULT_LOCALE, "/"),
    // A website, not an installable app.
    display: "browser",
    background_color: BRAND_COLORS.white,
    theme_color: SITE.themeColor,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
