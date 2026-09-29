/*
 * SmartLink is the one link primitive: pass any href and it picks the right element.
 *  - internal page path ("/about")            -> locale-aware Link (adds /en, /zh, /ar)
 *  - external URL, mailto:, tel:               -> plain <a>; http(s) links get rel="noopener noreferrer"
 *  - "#fragment", /api|/admin|/media|/files, or a path with a file extension (/documents/x.png)
 *                                              -> plain <a> (the locale proxy never rewrites these)
 */
import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const WEB_URL = /^(https?:)?\/\//i;
const UNLOCALISED_PREFIXES = ["/api", "/admin", "/media", "/files", "/_next"];
const FILE_EXTENSION = /\.[a-z0-9]{1,8}$/i;

export function isExternalHref(href: string): boolean {
  return SCHEME.test(href) || href.startsWith("//");
}

/** True for internal paths that must go through the locale-aware Link. */
export function isLocalisedInternalHref(href: string): boolean {
  if (isExternalHref(href) || !href.startsWith("/")) return false;
  const path = href.split(/[?#]/, 1)[0] ?? "";
  if (UNLOCALISED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return false;
  return !FILE_EXTENSION.test(path);
}

function withNoopener(rel: string | undefined): string {
  const tokens = new Set((rel ?? "").split(/\s+/).filter(Boolean));
  tokens.add("noopener");
  tokens.add("noreferrer");
  return [...tokens].join(" ");
}

export type SmartLinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

export function SmartLink({ href, rel, ref, ...props }: SmartLinkProps) {
  if (isLocalisedInternalHref(href)) {
    return <Link href={href} rel={rel} ref={ref} {...props} />;
  }
  return <a href={href} rel={WEB_URL.test(href) ? withNoopener(rel) : rel} ref={ref} {...props} />;
}
