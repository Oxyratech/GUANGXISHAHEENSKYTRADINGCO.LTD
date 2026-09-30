import "server-only";
import { unstable_cache } from "next/cache";
import type { Locale } from "@/i18n/locales";
import { logger } from "@/lib/logger";
import { getDb, isDatabaseConfigured, isDatabaseUnavailableError } from "@/server/db";
import { PRODUCTS_CACHE_TAG, PRODUCTS_REVALIDATE_SECONDS } from "./constants";
import { mediaPath, textOrNull } from "./mappers";
import type { SeoOverride, SeoOverrideScope } from "./types";

const readOverride = unstable_cache(
  async (scope: SeoOverrideScope, refKey: string, locale: Locale): Promise<SeoOverride | null> => {
    const row = await getDb().seoMetadata.findUnique({
      where: { scope_refKey_locale: { scope, refKey, locale } },
      select: {
        title: true,
        description: true,
        noIndex: true,
        ogMedia: { select: { id: true, kind: true, visibility: true, width: true, height: true } },
      },
    });
    if (!row) return null;

    // Only a public image can be a social card: private files answer 404 to crawlers.
    const media = row.ogMedia;
    const usable = media?.kind === "IMAGE" && media.visibility === "PUBLIC";
    return {
      title: textOrNull(row.title),
      description: textOrNull(row.description),
      noIndex: row.noIndex,
      ogImage:
        media && usable
          ? { url: mediaPath(media.id), width: media.width, height: media.height }
          : null,
    };
  },
  ["products", "seo-override"],
  { revalidate: PRODUCTS_REVALIDATE_SECONDS, tags: [PRODUCTS_CACHE_TAG] },
);

/**
 * The editor's optional metadata override for a product (`refKey` = product slug) or a category
 * (`refKey` = category slug) in one locale, or null. Every failure also gives null: the generated
 * metadata is always a valid fallback, so a missing or unreachable database must never break a page.
 */
export async function getSeoOverride(input: {
  scope: SeoOverrideScope;
  refKey: string;
  locale: Locale;
}): Promise<SeoOverride | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    return await readOverride(input.scope, input.refKey, input.locale);
  } catch (error) {
    const unavailable = isDatabaseUnavailableError(error);
    logger[unavailable ? "warn" : "error"]("products.seo_override_failed", {
      scope: input.scope,
      unavailable,
      error,
    });
    return null;
  }
}
