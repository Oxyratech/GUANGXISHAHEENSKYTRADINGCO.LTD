/**
 * The three legal documents: the key of each in the `legal` namespace (also its key under
 * `common.nav` for the page name) and its address.
 */
export const LEGAL_DOCS = {
  privacy: { path: "/privacy-policy" },
  terms: { path: "/terms" },
  cookies: { path: "/cookies" },
} as const;

export type LegalDocKey = keyof typeof LEGAL_DOCS;
