import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { LOCALES, type Locale } from "@/i18n/locales";
import type { PublishStatus } from "@/lib/domain/statuses";
import { buildPageMeta, type PageMeta, type PageParams } from "@/server/admin/pagination";
import { getDb } from "@/server/db";
import { toDatabaseError } from "@/server/db/errors";
import type { ProductListFilters } from "./filters";

/*
 * The admin products list query. Unlike the public repository (src/server/products), this one shows
 * every status, selects the admin-only columns (status, sortOrder, version, translation coverage) and
 * is never cached: an editor must always see the row they just saved.
 */

export interface ProductListRow {
  id: string;
  slug: string;
  categorySlug: string;
  status: PublishStatus;
  featured: boolean;
  sortOrder: number;
  updatedAt: Date;
  primaryImage: { id: string; fileName: string } | null;
  /** English name, falling back to the first locale (in site order) that has one. */
  displayName: string;
  translatedLocales: Locale[];
}

export interface ProductListResult {
  rows: ProductListRow[];
  meta: PageMeta;
}

function buildWhere(filters: ProductListFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.category) where.categorySlug = filters.category;
  if (filters.q) {
    const q = filters.q;
    where.OR = [{ slug: { contains: q } }, { translations: { some: { name: { contains: q } } } }];
  }
  return where;
}

const ORDER_BY: Record<ProductListFilters["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
  updated: [{ updatedAt: "desc" }],
  name: [{ slug: "asc" }],
  sortOrder: [{ sortOrder: "asc" }, { slug: "asc" }],
};

const SELECT = {
  id: true,
  slug: true,
  categorySlug: true,
  status: true,
  featured: true,
  sortOrder: true,
  updatedAt: true,
  translations: { select: { locale: true, name: true } },
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { mediaAsset: { select: { id: true, fileName: true } } },
  },
} as const;

interface Row {
  id: string;
  slug: string;
  categorySlug: string;
  status: string;
  featured: boolean;
  sortOrder: number;
  updatedAt: Date;
  translations: { locale: string; name: string }[];
  images: { mediaAsset: { id: string; fileName: string } }[];
}

function displayName(translations: Row["translations"], slug: string): string {
  for (const locale of LOCALES) {
    const found = translations.find((t) => t.locale === locale);
    if (found) return found.name;
  }
  return slug;
}

function toRow(row: Row): ProductListRow {
  return {
    id: row.id,
    slug: row.slug,
    categorySlug: row.categorySlug,
    status: row.status as PublishStatus,
    featured: row.featured,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
    primaryImage: row.images[0]?.mediaAsset ?? null,
    displayName: displayName(row.translations, row.slug),
    translatedLocales: LOCALES.filter((locale) =>
      row.translations.some((t) => t.locale === locale),
    ),
  };
}

export async function listProducts(
  filters: ProductListFilters,
  page: PageParams,
): Promise<ProductListResult> {
  const where = buildWhere(filters);
  try {
    const db = getDb();
    const [total, rows] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        orderBy: ORDER_BY[filters.sort],
        skip: page.skip,
        take: page.take,
        select: SELECT,
      }),
    ]);
    return { rows: rows.map(toRow), meta: buildPageMeta(total, page.page, page.pageSize) };
  } catch (error) {
    throw toDatabaseError(error);
  }
}
