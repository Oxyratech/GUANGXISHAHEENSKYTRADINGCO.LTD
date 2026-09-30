import "server-only";
import { LOCALES, type Locale } from "@/i18n/locales";
import type { SeoScope } from "@/lib/domain/statuses";
import { getDb, toDatabaseError } from "@/server/db";
import {
  CATEGORY_SEO_TARGETS,
  findCategoryTarget,
  findStaticTarget,
  STATIC_SEO_TARGETS,
  type SeoTarget,
} from "./targets";

/*
 * Read side of the admin SEO screens: which of the enumerable targets (static pages, categories)
 * already have an override in each locale, the full set of override rows for one target's editor,
 * and search over products/news for the two target kinds that are too numerous to list.
 */

export interface SeoDirectoryEntry extends SeoTarget {
  overriddenLocales: Locale[];
}

function targetKey(scope: string, refKey: string): string {
  return `${scope}:${refKey}`;
}

/** The static-page and category targets, each with the locales that already carry an override. */
export async function listStaticSeoDirectory(): Promise<SeoDirectoryEntry[]> {
  try {
    const rows = await getDb().seoMetadata.findMany({
      where: { scope: { in: ["PAGE", "CATEGORY"] } },
      select: { scope: true, refKey: true, locale: true },
    });
    const byTarget = new Map<string, Set<string>>();
    for (const row of rows) {
      const key = targetKey(row.scope, row.refKey);
      const set = byTarget.get(key) ?? new Set<string>();
      set.add(row.locale);
      byTarget.set(key, set);
    }
    const all = [...STATIC_SEO_TARGETS, ...CATEGORY_SEO_TARGETS];
    return all.map((target) => ({
      ...target,
      overriddenLocales: LOCALES.filter((locale) =>
        byTarget.get(targetKey(target.scope, target.refKey))?.has(locale),
      ),
    }));
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export interface SeoOverrideRow {
  id: string;
  locale: Locale;
  title: string | null;
  description: string | null;
  noIndex: boolean;
  ogMedia: { id: string; width: number | null; height: number | null } | null;
  updatedAt: string;
}

/** Every locale row already saved for one (scope, refKey), for the side-by-side editor. */
export async function getOverrideRows(scope: SeoScope, refKey: string): Promise<SeoOverrideRow[]> {
  try {
    const rows = await getDb().seoMetadata.findMany({
      where: { scope, refKey },
      select: {
        id: true,
        locale: true,
        title: true,
        description: true,
        noIndex: true,
        updatedAt: true,
        ogMedia: { select: { id: true, width: true, height: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      locale: row.locale as Locale,
      title: row.title,
      description: row.description,
      noIndex: row.noIndex,
      ogMedia: row.ogMedia,
      updatedAt: row.updatedAt.toISOString(),
    }));
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export interface SeoSearchResult {
  refKey: string;
  label: string;
  sublabel: string;
  /** Locales this entity itself has content in (a product's translations, a news article's own locale). */
  locales: Locale[];
}

const SEARCH_LIMIT = 20;

/**
 * Products by slug or name, newest first, for the "find a product to override" search box. `refKey`
 * is the product's slug — the same key the public product page already reads its override by (see
 * @/server/products/seo-override) — not the row id, so an override saved here takes effect there.
 */
export async function searchProductTargets(query: string): Promise<SeoSearchResult[]> {
  try {
    const q = query.trim();
    const rows = await getDb().product.findMany({
      where: q
        ? { OR: [{ slug: { contains: q } }, { translations: { some: { name: { contains: q } } } }] }
        : {},
      take: SEARCH_LIMIT,
      orderBy: { updatedAt: "desc" },
      select: { slug: true, translations: { select: { locale: true, name: true } } },
    });
    return rows.map((row) => ({
      refKey: row.slug,
      label:
        row.translations.find((t) => t.locale === "en")?.name ??
        row.translations[0]?.name ??
        row.slug,
      sublabel: row.slug,
      locales: row.translations.map((t) => t.locale as Locale),
    }));
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/** News articles by slug or title, newest first. Each language version is its own row and target. */
export async function searchNewsTargets(query: string): Promise<SeoSearchResult[]> {
  try {
    const q = query.trim();
    const rows = await getDb().newsArticle.findMany({
      where: q ? { OR: [{ slug: { contains: q } }, { title: { contains: q } }] } : {},
      take: SEARCH_LIMIT,
      orderBy: { updatedAt: "desc" },
      select: { id: true, slug: true, title: true, locale: true },
    });
    return rows.map((row) => ({
      refKey: row.id,
      label: row.title,
      sublabel: `${row.slug} · ${row.locale.toUpperCase()}`,
      locales: [row.locale as Locale],
    }));
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export interface SeoEditorContext {
  label: string;
  sublabel: string | null;
  /** Locales the target has content in. A news article's row is already locale-pinned: exactly one. */
  locales: Locale[];
  publicPath: string | null;
}

/**
 * What the editor's header needs for one target: its display label, the public path (when it has one
 * fixed path) and which locales apply. Returns null when the target no longer exists (a stale link,
 * or a product/article deleted after the link was shared).
 */
export async function getSeoEditorContext(
  scope: SeoScope,
  refKey: string,
): Promise<SeoEditorContext | null> {
  if (scope === "PAGE") {
    const target = findStaticTarget(refKey);
    return target
      ? {
          label: target.label,
          sublabel: null,
          locales: [...LOCALES],
          publicPath: target.publicPath,
        }
      : null;
  }
  if (scope === "CATEGORY") {
    const target = findCategoryTarget(refKey);
    return target
      ? {
          label: target.label,
          sublabel: null,
          locales: [...LOCALES],
          publicPath: target.publicPath,
        }
      : null;
  }

  try {
    if (scope === "PRODUCT") {
      // refKey is the product's slug (see searchProductTargets); that is also its primary key here.
      const product = await getDb().product.findUnique({
        where: { slug: refKey },
        select: {
          slug: true,
          categorySlug: true,
          translations: { select: { locale: true, name: true } },
        },
      });
      if (!product) return null;
      return {
        label:
          product.translations.find((t) => t.locale === "en")?.name ??
          product.translations[0]?.name ??
          product.slug,
        sublabel: product.slug,
        locales: [...LOCALES],
        publicPath: `/products/${product.categorySlug}/${product.slug}`,
      };
    }

    // NEWS: one row is one language version, so exactly one locale ever applies to this refKey.
    const article = await getDb().newsArticle.findUnique({
      where: { id: refKey },
      select: { title: true, slug: true, locale: true },
    });
    if (!article) return null;
    return {
      label: article.title,
      sublabel: `${article.slug} · ${article.locale.toUpperCase()}`,
      locales: [article.locale as Locale],
      publicPath: `/news/${article.slug}`,
    };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
