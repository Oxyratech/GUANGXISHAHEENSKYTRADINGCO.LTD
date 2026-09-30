import type { CategorySlug } from "@/content/categories";
import type { Locale } from "@/i18n/locales";
import type { DocumentKind } from "@/lib/domain/statuses";
import type { DatabaseUnavailableCause } from "@/server/db/errors";

/*
 * Public read models of the product catalogue.
 *
 * They carry only what a visitor may see: no ids, status, sort order, creator or internal notes.
 * They are plain JSON (dates are ISO strings) because unstable_cache stores them as JSON.
 */

/**
 * Every repository function returns this instead of throwing when the database cannot be used
 * (no DATABASE_URL, unreachable, migrations not applied). The page decides how to say so; the type
 * makes forgetting to handle it a compile error. Anything else that goes wrong is a bug and throws.
 */
export type ProductsResult<T> =
  { ok: true; data: T } | { ok: false; cause: DatabaseUnavailableCause };

export interface PublicProductImage {
  /** Site-relative URL of the public media route: /media/<id>. */
  src: string;
  /** Translated alt text, falling back to English and then to the product name. */
  alt: string;
  width: number | null;
  height: number | null;
}

export interface ProductSummary {
  slug: string;
  categorySlug: CategorySlug;
  name: string;
  shortDescription: string | null;
  /**
   * Language of `name` and `shortDescription`. It differs from the requested locale when the
   * product has no translation for it and the English one is shown instead.
   */
  contentLocale: Locale;
  /** The primary image, or the first one when none is marked primary. */
  image: PublicProductImage | null;
}

export interface ProductSpecificationRow {
  label: string;
  value: string;
  contentLocale: Locale;
}

export interface ProductDocument {
  kind: DocumentKind;
  title: string;
  contentLocale: Locale;
  /** Site-relative URL of the public media route. Only PUBLIC assets are ever listed. */
  href: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ProductDetail extends ProductSummary {
  origin: string | null;
  /** Plain text or Markdown without raw HTML. */
  description: string | null;
  applications: string | null;
  packagingInfo: string | null;
  /** Primary image first. */
  images: PublicProductImage[];
  specifications: ProductSpecificationRow[];
  documents: ProductDocument[];
  /** Other published products of the same category. */
  related: ProductSummary[];
  /** Locales that have their own translation (the others fall back to English). */
  translatedLocales: Locale[];
  publishedAt: string | null;
  updatedAt: string;
}

export interface ProductPage {
  items: ProductSummary[];
  /** All published products matching the query, across pages. */
  total: number;
  /** The page actually returned: the requested one clamped to 1..pageCount. */
  page: number;
  pageSize: number;
  pageCount: number;
}

export type CategoryProductCounts = Record<CategorySlug, number>;

export interface SeoOverride {
  title: string | null;
  description: string | null;
  noIndex: boolean;
  ogImage: { url: string; width: number | null; height: number | null } | null;
}

export type SeoOverrideScope = "PRODUCT" | "CATEGORY";
