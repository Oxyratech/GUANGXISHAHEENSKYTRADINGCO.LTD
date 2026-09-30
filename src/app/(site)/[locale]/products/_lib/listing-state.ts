import type { ProductPage, ProductsResult } from "@/server/products";

export type ListingState =
  { kind: "unavailable" } | { kind: "empty" } | { kind: "products"; page: ProductPage };

/**
 * What a product listing shows. An unreachable database is "unavailable"; a database that is not
 * configured at all is "empty", which is true (nothing can have been published) and keeps a
 * deployment without a database looking finished rather than broken.
 */
export function toListingState(result: ProductsResult<ProductPage>): ListingState {
  if (!result.ok)
    return result.cause === "not_configured" ? { kind: "empty" } : { kind: "unavailable" };
  return result.data.items.length === 0
    ? { kind: "empty" }
    : { kind: "products", page: result.data };
}
