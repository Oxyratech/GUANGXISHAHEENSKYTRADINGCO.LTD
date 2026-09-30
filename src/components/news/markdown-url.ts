/*
 * Which addresses an article body may link to or embed. Everything else is dropped: the words of a
 * link stay, the link itself does not. This is an allow-list on purpose. A deny-list of schemes
 * ("javascript:", "data:", "vbscript:", ...) always misses one.
 */
export type SafeUrl =
  /** A page or file of this site: "/inquiry", "/media/<id>". */
  | { kind: "internal" }
  /** "#section" on the same page. */
  | { kind: "anchor" }
  /** http(s) address on another site. */
  | { kind: "external" }
  /** mailto: or tel: */
  | { kind: "contact" };

const CONTACT_SCHEMES = new Set(["mailto:", "tel:"]);
const WEB_SCHEMES = new Set(["http:", "https:"]);

/** Whitespace and control characters can hide a scheme from a filter but not from a browser. */
const HIDDEN_CHARACTERS = /[\p{Cc}\s]/u;
const SCHEME = /^([a-z][a-z0-9+.-]*:)/i;

export function classifyUrl(raw: string | undefined | null): SafeUrl | null {
  const url = raw?.trim();
  if (!url || HIDDEN_CHARACTERS.test(url)) return null;
  // Browsers read "\" as "/", so "/\example.com" would leave the site.
  if (url.includes("\\")) return null;

  if (url.startsWith("#")) return url.length > 1 ? { kind: "anchor" } : null;
  if (url.startsWith("/")) return url.startsWith("//") ? null : { kind: "internal" };

  const scheme = SCHEME.exec(url)?.[1]?.toLowerCase();
  if (!scheme) return null; // a bare relative path such as "foo/bar" is ambiguous
  if (WEB_SCHEMES.has(scheme))
    return /^https?:\/\/[^/?#]+/i.test(url) ? { kind: "external" } : null;
  return CONTACT_SCHEMES.has(scheme) ? { kind: "contact" } : null;
}
