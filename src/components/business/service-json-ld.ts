import { COMPANY_DISPLAY_NAME, organizationJsonLd, type JsonLdObject } from "@/lib/seo";

/**
 * schema.org Service for a business line page: name, description and provider only. There is
 * deliberately no areaServed, offers, price or serviceType: the site makes no claim about markets
 * served or terms, and structured data must not say more than the page does.
 */
export function serviceJsonLd({
  name,
  description,
}: {
  name: string;
  description: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    // The same @id the layout gives the Organization, so search engines connect the two.
    provider: {
      "@type": "Organization",
      "@id": organizationJsonLd()["@id"],
      name: COMPANY_DISPLAY_NAME,
    },
  };
}
