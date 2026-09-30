/*
 * Limits on a product's child collections. Kept apart from ./schemas (which pulls in zod and the
 * server-only admin-action helpers) so the client editors can import a plain number without dragging
 * server-only code — and therefore the database driver — into the browser bundle.
 */
export const MAX_PRODUCT_IMAGES = 12;
export const MAX_PRODUCT_DOCUMENTS = 10;
export const MAX_PRODUCT_SPECIFICATIONS = 30;
