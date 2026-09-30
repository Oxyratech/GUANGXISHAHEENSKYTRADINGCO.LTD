/**
 * Best-effort kebab-case suggestion from an English product name, e.g. "Steel Wire Mesh #4" ->
 * "steel-wire-mesh-4". It is only a starting point: the slug field stays editable and the server
 * validates the final value against the same pattern (see server/admin/products/schemas.ts).
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
