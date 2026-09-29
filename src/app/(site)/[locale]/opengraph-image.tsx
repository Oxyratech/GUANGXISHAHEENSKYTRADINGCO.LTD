import { ImageResponse } from "next/og";
import { LOCALES } from "@/i18n/locales";
import { OgCard } from "@/lib/seo/OgCard";

/*
 * The card is Latin-only in every locale (wordmark, tagline and legal name in English). ImageResponse
 * ships only a Latin font; rendering Chinese or Arabic would need an embedded CJK/Arabic font, and a
 * subset large enough for arbitrary page text exceeds the 500 KB limit of the OG image bundle, while
 * missing glyphs render as empty boxes. The brand name is Latin in all locales anyway, so one card
 * serves all three.
 *
 * `alt` and `size` are literals because Next reads them statically; image-routes.test.tsx keeps
 * them equal to DEFAULT_OG_IMAGE_ALT and OG_IMAGE_SIZE, which buildMetadata advertises.
 */
export const alt = "Shaheen Sky: Connecting Global Markets Through Trade";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Without these the route renders on every request instead of once per locale at build time.
export const dynamicParams = false;
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default function OpenGraphImage() {
  return new ImageResponse(<OgCard />, { ...size });
}
