import type { Locale } from "@/i18n/locales";
import { absoluteUrl } from "./urls";

/**
 * Directory of src/app/(site)/[locale]/opengraph-image.tsx as Next sees it. Because it sits under a
 * route group, Next serves the image at `/<locale>/opengraph-image-<hash>` where <hash> is a djb2
 * hash of this directory. A page's own `openGraph` replaces the layout-level image instead of
 * inheriting it, so buildMetadata has to name the URL explicitly; og-image.test.ts checks this
 * against Next's own function so a change in Next or in the file location fails a test.
 */
const OG_IMAGE_SEGMENT = "/(site)/[locale]";

function djb2Hash(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++)
    hash = ((hash << 5) + hash + value.charCodeAt(i)) & 0xffffffff;
  return hash >>> 0;
}

const OG_IMAGE_ROUTE_SUFFIX = djb2Hash(OG_IMAGE_SEGMENT).toString(36).slice(0, 6);

export function ogImagePath(locale: Locale): string {
  return `/${locale}/opengraph-image-${OG_IMAGE_ROUTE_SUFFIX}`;
}

export function ogImageUrl(locale: Locale): string {
  return absoluteUrl(ogImagePath(locale));
}
