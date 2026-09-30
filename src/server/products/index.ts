/*
 * Public product repository. Import from "@/server/products", never from its internals.
 *
 *   listPublishedProducts({ locale, categorySlug?, page, pageSize })  -> ProductsResult<ProductPage>
 *   getPublishedProduct({ locale, categorySlug, slug })              -> ProductsResult<ProductDetail | null>
 *   countPublishedByCategory(locale = "en")                           -> ProductsResult<CategoryProductCounts>
 *   getSeoOverride({ scope, refKey, locale })                        -> SeoOverride | null
 */
export {
  MAX_PRODUCTS_PAGE_SIZE,
  PRODUCTS_CACHE_TAG,
  PRODUCTS_PAGE_SIZE,
  PRODUCTS_REVALIDATE_SECONDS,
  RELATED_PRODUCTS_COUNT,
} from "./constants";
export {
  countPublishedByCategory,
  getPublishedProduct,
  listPublishedProducts,
  type GetPublishedProductInput,
  type ListPublishedProductsInput,
} from "./repository";
export { getSeoOverride } from "./seo-override";
export type {
  CategoryProductCounts,
  ProductDetail,
  ProductDocument,
  ProductPage,
  ProductsResult,
  ProductSpecificationRow,
  ProductSummary,
  PublicProductImage,
  SeoOverride,
  SeoOverrideScope,
} from "./types";
