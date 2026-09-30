import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { LOCALES } from "@/i18n/locales";
// Imported from the constants module directly, not the "@/server/products" barrel: that barrel pulls
// in the repository, which calls unstable_cache at module scope, for what is otherwise one string.
import { PRODUCTS_CACHE_TAG } from "@/server/products/constants";

/*
 * One place that knows every public URL a product write can affect, so no action forgets one.
 * `revalidateTag` clears the cached repository reads (src/server/products/repository.ts); the explicit
 * `revalidatePath` calls also refresh the Full Route Cache of the pages that render them, per
 * docs/ARCHITECTURE.md's instruction to call both after every admin product write.
 */

/** Call once per distinct (categorySlug, slug) pair a write touched — the old one and the new one. */
export function revalidateProductPublicPages(categorySlug: string, slug?: string): void {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/products`);
    revalidatePath(`/${locale}/products/${categorySlug}`);
    if (slug) revalidatePath(`/${locale}/products/${categorySlug}/${slug}`);
  }
}

export function revalidateProductAdminPages(id: string): void {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

/**
 * Call after every write that can change what a visitor sees. `categories` lists every
 * (categorySlug, slug) pair to refresh — pass both the old and the new one when either changed.
 */
export function revalidateProduct(
  id: string,
  categories: readonly { categorySlug: string; slug?: string }[],
): void {
  revalidateTag(PRODUCTS_CACHE_TAG, { expire: 0 });
  revalidateProductAdminPages(id);
  for (const entry of categories) revalidateProductPublicPages(entry.categorySlug, entry.slug);
}
