import "server-only";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/locales";
import { logger } from "@/lib/logger";
import type { SeoScope } from "@/lib/domain/statuses";
import { getDb, isDatabaseConfigured, isDatabaseUnavailableError } from "@/server/db";
import type { SeoOverride } from "./types";

export { SEO_SCOPES } from "@/lib/domain/statuses";
export type { SeoScope } from "@/lib/domain/statuses";
export type { SeoOverride, SeoOverrideLookup } from "./types";

/*
 * The public reader for editor-supplied SEO overrides (SeoMetadata rows), and the one place that
 * merges one onto the Metadata a page already built. Every public page's generateMetadata stays the
 * single source of the *default* title/description; this module only ever narrows or replaces it.
 *
 * Category, product and news detail pages already read their own override (see
 * @/server/products/seo-override and @/server/news's article query) because they need it merged
 * before the page-specific title is composed. This module additionally covers the static pages
 * (scope PAGE), which had no override mechanism until now, and is the generic reader the admin SEO
 * screens use for every scope.
 */

export const SEO_CACHE_TAG = "seo";
export const SEO_REVALIDATE_SECONDS = 300;

function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mediaPath(mediaAssetId: string): string {
  return `/media/${mediaAssetId}`;
}

const readOverride = unstable_cache(
  async (scope: SeoScope, refKey: string, locale: string): Promise<SeoOverride | null> => {
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

    // Only a public image can be a social card: a private file answers 404 to crawlers.
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
  ["seo", "override"],
  { revalidate: SEO_REVALIDATE_SECONDS, tags: [SEO_CACHE_TAG] },
);

/**
 * The optional metadata override for one target, or null. Every failure also gives null (never
 * throws): the generated metadata is always a valid fallback, so a missing or unreachable database
 * must never break a page. Cached for five minutes under the "seo" tag; the admin write side expires
 * that tag on save, so a published change is never held up by the cache.
 */
export async function getSeoOverride(input: {
  scope: SeoScope;
  refKey: string;
  locale: Locale;
}): Promise<SeoOverride | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    return await readOverride(input.scope, input.refKey, input.locale);
  } catch (error) {
    const unavailable = isDatabaseUnavailableError(error);
    logger[unavailable ? "warn" : "error"]("seo.override_failed", {
      scope: input.scope,
      refKey: input.refKey,
      unavailable,
      error,
    });
    return null;
  }
}

/**
 * The stable `refKey` for a static page (scope PAGE), from its pathname: "/" -> "home",
 * "/business/international-trading" -> "business/international-trading". Used by both the public
 * pages and the admin's directory of overridable targets, so the two always agree.
 */
export function pageKeyFromPath(path: string): string {
  const trimmed = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return trimmed === "" ? "home" : trimmed;
}

function titleText(title: Metadata["title"]): string {
  if (!title) return "";
  if (typeof title === "string") return title;
  if ("absolute" in title && title.absolute) return title.absolute;
  if ("default" in title && title.default) return title.default;
  return "";
}

/** A record cast is used only to reach into next's loosely-typed openGraph/twitter unions. */
type LooseMetadata = Record<string, unknown>;

function asLooseRecord(value: unknown): LooseMetadata {
  return typeof value === "object" && value !== null ? { ...(value as LooseMetadata) } : {};
}

/**
 * Merges an override onto the Metadata a page's generateMetadata already produced with buildMetadata:
 * title and description are replaced outright (an override's title is the whole title the editor
 * wrote, so it is used as-is — running it back through buildMetadata's title formatting would suffix
 * the site name a second time), the Open Graph image is swapped, and "no index" is applied. A null
 * override returns `metadata` unchanged.
 */
export function applySeoOverride(metadata: Metadata, override: SeoOverride | null): Metadata {
  if (!override) return metadata;

  const result: Metadata = { ...metadata };
  const finalTitle = override.title ?? titleText(metadata.title);

  if (override.title) result.title = { absolute: override.title };
  if (override.description) result.description = override.description;

  const openGraph = asLooseRecord(metadata.openGraph);
  const twitter = asLooseRecord(metadata.twitter);
  if (override.title) {
    openGraph.title = override.title;
    twitter.title = override.title;
  }
  if (override.description) {
    openGraph.description = override.description;
    twitter.description = override.description;
  }
  if (override.ogImage) {
    const url = /^https?:\/\//i.test(override.ogImage.url)
      ? override.ogImage.url
      : absoluteUrl(override.ogImage.url);
    const image: LooseMetadata = {
      url,
      alt: finalTitle,
      ...(override.ogImage.width && override.ogImage.height
        ? { width: override.ogImage.width, height: override.ogImage.height }
        : {}),
    };
    openGraph.images = [image];
    twitter.images = [{ url, alt: finalTitle }];
  }
  result.openGraph = openGraph as Metadata["openGraph"];
  result.twitter = twitter as Metadata["twitter"];

  if (override.noIndex) result.robots = { index: false, follow: false };
  else delete result.robots;

  return result;
}
