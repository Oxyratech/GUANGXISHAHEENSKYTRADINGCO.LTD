import { COMPANY } from "@/config/company";
import { LOCALE_META, type Locale } from "@/i18n/locales";
import { COMPANY_DISPLAY_NAME, localizedUrl, type JsonLdObject } from "@/lib/seo";

export interface CompanyPageJsonLdInput {
  /** AboutPage for the about page, WebPage for the registration page. */
  type: "AboutPage" | "WebPage";
  locale: Locale;
  /** Pathname without the locale prefix. */
  path: string;
  name: string;
  description: string;
}

/**
 * A page about the company. It names the organization only by the names on its license: no
 * ratings, awards, offices or contact points, none of which exist.
 */
export function companyPageJsonLd({
  type,
  locale,
  path,
  name,
  description,
}: CompanyPageJsonLdInput): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name,
    description,
    url: localizedUrl(locale, path),
    inLanguage: LOCALE_META[locale].htmlLang,
    about: {
      "@type": "Organization",
      name: COMPANY_DISPLAY_NAME,
      legalName: COMPANY.legalNameEn,
    },
  };
}
