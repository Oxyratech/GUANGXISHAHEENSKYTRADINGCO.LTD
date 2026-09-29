import "server-only";
import type { MetadataRoute } from "next";
import { isCategorySlug } from "@/content/categories";
import { isLocale } from "@/i18n/locales";
import { logger } from "@/lib/logger";
import type { PublishStatus } from "@/lib/domain/statuses";
import {
  DatabaseUnavailableError,
  getDb,
  isDatabaseConfigured,
  toDatabaseError,
} from "@/server/db";
import { alternatesForPaths, localizedUrl, type PathsByLocale } from "./urls";

const PUBLISHED: PublishStatus = "PUBLISHED";

/** One sitemap file may hold 50,000 URLs; each product yields up to three, each article one. */
const MAX_ROWS = 10_000;

/** Prisma: the table (P2021) or column (P2022) does not exist yet, i.e. migrations have not run. */
const SCHEMA_NOT_READY_CODES = new Set(["P2021", "P2022"]);

function errorCode(error: unknown): string | undefined {
  const code =
    typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
  return typeof code === "string" ? code : undefined;
}

interface ProductRow {
  slug: string;
  categorySlug: string;
  updatedAt: Date;
  translations: readonly { locale: string }[];
}

interface ArticleRow {
  slug: string;
  locale: string;
  updatedAt: Date;
  translationGroupId: string;
}

/** A product page exists in each locale that has a translation. */
function productEntries(rows: readonly ProductRow[]): MetadataRoute.Sitemap {
  return rows.flatMap((row) => {
    if (!isCategorySlug(row.categorySlug)) return [];
    const path = `/products/${row.categorySlug}/${row.slug}`;
    const locales = [...new Set(row.translations.map((t) => t.locale))].filter(isLocale);
    const languages = alternatesForPaths(
      Object.fromEntries(locales.map((locale) => [locale, path])),
    );
    return locales.map((locale) => ({
      url: localizedUrl(locale, path),
      lastModified: row.updatedAt,
      alternates: { languages },
    }));
  });
}

/**
 * News is authored per language, so the slug differs per locale: language versions are linked by
 * `translationGroupId`, and each article's alternates are the published versions of its group.
 */
function newsEntries(rows: readonly ArticleRow[]): MetadataRoute.Sitemap {
  const pathsByGroup = new Map<string, PathsByLocale>();
  for (const row of rows) {
    if (!isLocale(row.locale)) continue;
    const paths = pathsByGroup.get(row.translationGroupId) ?? {};
    paths[row.locale] = `/news/${row.slug}`;
    pathsByGroup.set(row.translationGroupId, paths);
  }

  return rows.flatMap((row) => {
    if (!isLocale(row.locale)) return [];
    const languages = alternatesForPaths(pathsByGroup.get(row.translationGroupId) ?? {});
    return [
      {
        url: localizedUrl(row.locale, `/news/${row.slug}`),
        lastModified: row.updatedAt,
        alternates: { languages },
      },
    ];
  });
}

/**
 * Published products and news articles. Reads only slug, locale and modification date columns.
 *
 * Returns [] whenever the database cannot be used (no DATABASE_URL, unreachable, migrations not
 * applied yet): a build must never fail for that reason, and the sitemap is revalidated regularly so
 * it fills in as soon as the database is available. Any other error is a bug and is rethrown.
 */
export async function getDynamicSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  if (!isDatabaseConfigured()) return [];

  try {
    const db = getDb();
    const now = new Date();
    // Published and not scheduled for the future. `now` filters rows; it is never a lastModified.
    const visible = {
      status: PUBLISHED,
      OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
    };

    const [products, articles] = await Promise.all([
      db.product.findMany({
        where: visible,
        select: {
          slug: true,
          categorySlug: true,
          updatedAt: true,
          translations: { select: { locale: true } },
        },
        orderBy: { slug: "asc" },
        take: MAX_ROWS,
      }),
      db.newsArticle.findMany({
        where: visible,
        select: { slug: true, locale: true, updatedAt: true, translationGroupId: true },
        orderBy: { slug: "asc" },
        take: MAX_ROWS,
      }),
    ]);

    return [...productEntries(products), ...newsEntries(articles)];
  } catch (error) {
    const code = errorCode(error);
    if (
      toDatabaseError(error) instanceof DatabaseUnavailableError ||
      (code !== undefined && SCHEMA_NOT_READY_CODES.has(code))
    ) {
      logger.debug("sitemap.dynamic_entries_skipped", { code });
      return [];
    }
    throw error;
  }
}
