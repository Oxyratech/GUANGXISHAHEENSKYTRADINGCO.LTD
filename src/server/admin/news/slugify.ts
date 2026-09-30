/*
 * Pure slug helpers, free of `server-only`: the editor's "suggest from title" control runs this in
 * the browser, and the create/update actions run the same function on the server so both agree on
 * what a valid slug looks like.
 */

/** ASCII, lower-case, hyphen-separated slug candidates only; the editor may still adjust it by hand. */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidNewsSlug(value: string): boolean {
  return value.length > 0 && value.length <= 160 && SLUG_PATTERN.test(value);
}

/**
 * A slug suggestion from a title: strip accents, drop anything that is not a letter/digit, collapse
 * to hyphens. Titles in Chinese or Arabic script contain no Latin letters to keep, so they fall back
 * to "article" — the editor is expected to type a slug by hand for those.
 */
export function suggestSlugFromTitle(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
  return slug || "article";
}
