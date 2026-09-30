import type { SeoImage } from "@/lib/seo";

/** A social-card image; the size is included only when both dimensions are known. */
export function toSeoImage(
  url: string,
  alt: string,
  width: number | null,
  height: number | null,
): SeoImage {
  return width && height ? { url, alt, width, height } : { url, alt };
}
