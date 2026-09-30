/**
 * Every cookie the site can set, by name. The cookies page states these names, so a change to
 * either cookie in code has to change this list (cookie-inventory.test.ts reads the code to check).
 * Descriptions live in the `legal` namespace under `cookies.table.rows.<id>`.
 */
export const COOKIES = [
  // next-intl's locale cookie (src/i18n/routing.ts sets no options, so it is a session cookie).
  { id: "language", name: "NEXT_LOCALE" },
  // The admin session (src/server/auth/session.ts). The __Host- prefix is production only.
  { id: "session", name: "__Host-shaheen_session" },
] as const;

export type CookieId = (typeof COOKIES)[number]["id"];
