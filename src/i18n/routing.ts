import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "./locales";

/**
 * Locale-prefixed URLs everywhere (/en, /zh, /ar). Pathnames are identical across locales, which
 * keeps hreflang alternates and the language switcher trivial.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
});
