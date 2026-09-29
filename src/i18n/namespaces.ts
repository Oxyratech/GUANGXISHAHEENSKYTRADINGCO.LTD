/**
 * i18n namespaces. Each namespace is one JSON file per locale at src/messages/<locale>/<ns>.json.
 * Every namespace must exist for every locale with an identical key structure (enforced by
 * src/i18n/messages.test.ts). English is the source of truth for the generated key types.
 *
 * Ownership convention: a page/feature owns the namespace(s) of the same name.
 */
export const NAMESPACES = [
  "common", // navigation, footer, buttons, shared labels, aria labels, language names, shared SEO
  "home",
  "about",
  "business", // /business index
  "services", // the six service pages + names/summaries used in cards and menus
  "categories", // the 12 category names/descriptions (used across the site)
  "products", // products index/category/detail, product card labels, empty states
  "globalTrade", // /global-trade, /global-trade/how-it-works, trade process steps
  "companyInfo", // /company-information
  "scope", // business-scope group names and per-item translations
  "news",
  "faq",
  "contact",
  "inquiry", // inquiry form + status/confirmation
  "legal", // privacy, terms, cookies
  "errors", // 404 / 500 / loading / network / upload errors
  "validation", // shared form-validation messages
] as const;

export type Namespace = (typeof NAMESPACES)[number];
