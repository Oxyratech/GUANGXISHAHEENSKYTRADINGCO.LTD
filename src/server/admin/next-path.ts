/*
 * The `?next=` parameter of the login page: where to go after signing in. It is user-controlled input
 * that ends in a redirect, so it is reduced to an internal admin path or dropped. Pure and free of
 * `server-only` (client components build login links with it).
 */
import { ADMIN_PATH_PREFIX } from "@/config/routes";

export const ADMIN_HOME = ADMIN_PATH_PREFIX;
export const ADMIN_LOGIN_PATH = `${ADMIN_PATH_PREFIX}/login`;

const MAX_NEXT_LENGTH = 2000;
/** Never reached: only its origin is compared, to catch anything that resolves off-site. */
const PLACEHOLDER_ORIGIN = "http://admin.invalid";

function hasControlOrBackslash(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f || code === 0x5c) return true;
  }
  return false;
}

/**
 * Returns an internal path under /admin (with its query string), or "/admin" for anything else:
 * absolute URLs, protocol-relative `//host`, backslash tricks, other sections of the site, the login
 * page itself (a redirect loop), and non-strings. The value is parsed and re-serialised, so what is
 * returned is exactly what was validated (dot segments and percent-encoded dots are resolved first).
 */
export function sanitizeAdminNextPath(raw: unknown): string {
  if (typeof raw !== "string") return ADMIN_HOME;
  const value = raw.trim();
  if (value.length === 0 || value.length > MAX_NEXT_LENGTH) return ADMIN_HOME;
  if (!value.startsWith("/") || value.startsWith("//") || hasControlOrBackslash(value)) {
    return ADMIN_HOME;
  }

  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return ADMIN_HOME;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return ADMIN_HOME;

  const { pathname } = url;
  const insideAdmin = pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
  const isLogin = pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`);
  if (!insideAdmin || isLogin) return ADMIN_HOME;

  return `${pathname}${url.search}`;
}

/** The login URL, remembering where the visitor was going when that is worth remembering. */
export function adminLoginPath(next?: string | null): string {
  const target = sanitizeAdminNextPath(next);
  return target === ADMIN_HOME
    ? ADMIN_LOGIN_PATH
    : `${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(target)}`;
}
