import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Locale negotiation and prefixing. Admin, API, media and framework/static paths are excluded:
 * they are not localised. (Authorisation is enforced in server code, never only here.)
 */
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|admin|_next|_vercel|media|files|.*\..*).*)"],
};
