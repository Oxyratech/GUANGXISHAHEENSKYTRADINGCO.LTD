import { COMPANY } from "@/config/company";
import { SITE } from "@/config/site";

/** "Guangxi Shaheen Sky Trading Co., Ltd." — the registered name in title case, derived from the license. */
export const COMPANY_DISPLAY_NAME = COMPANY.legalNameEn
  .split(" ")
  .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
  .join(" ");

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const OG_TAGLINE = "Connecting Global Markets Through Trade";

/**
 * The default social card is Latin-only in every locale (see opengraph-image.tsx), so its alt text
 * is English too.
 */
export const DEFAULT_OG_IMAGE_ALT = `${SITE.name}: ${OG_TAGLINE}`;
