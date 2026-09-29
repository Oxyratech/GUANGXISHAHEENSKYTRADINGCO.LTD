import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Locale negotiation and prefixing. Admin, API, media and framework/static paths are excluded:
 * they are not localised. (Authorisation is enforced in server code, never only here.)
 */
export default createMiddleware(routing);

export const config = {
  // `\\.` must stay double-escaped: in a plain string `\.` collapses to `.` and only "/" would match.
  // apple-icon is the one metadata route without a file extension.
  matcher: ["/((?!api|admin|_next|_vercel|media|files|apple-icon|.*\\..*).*)"],
};
