/** Cache tag on everything derived from product rows. Admin edits expire it so changes show at once. */
export const PRODUCTS_CACHE_TAG = "products";

/** Listings are re-read at most this often when nothing invalidates the tag. */
export const PRODUCTS_REVALIDATE_SECONDS = 300;

/** Products per page on category pages (a 3-column grid, four rows). */
export const PRODUCTS_PAGE_SIZE = 12;

/** Upper bound for a caller-supplied page size. */
export const MAX_PRODUCTS_PAGE_SIZE = 48;

/** Products shown under "Related products" on a product page. */
export const RELATED_PRODUCTS_COUNT = 3;
