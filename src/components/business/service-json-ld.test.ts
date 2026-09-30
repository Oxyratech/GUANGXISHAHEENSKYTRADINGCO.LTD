import { describe, expect, it } from "vitest";
import { COMPANY_DISPLAY_NAME, organizationJsonLd } from "@/lib/seo";
import { serviceJsonLd } from "./service-json-ld";

describe("serviceJsonLd", () => {
  const data = serviceJsonLd({
    name: "Import & Export",
    description: "Import and export of goods.",
  });

  it("is a schema.org Service with a name and a description", () => {
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Import & Export",
      description: "Import and export of goods.",
    });
  });

  it("names the company as provider, using the Organization the layout emits", () => {
    expect(data.provider).toEqual({
      "@type": "Organization",
      "@id": organizationJsonLd()["@id"],
      name: COMPANY_DISPLAY_NAME,
    });
  });

  it("claims nothing else: no areaServed, offers, price, rating or service area", () => {
    expect(Object.keys(data).sort()).toEqual([
      "@context",
      "@type",
      "description",
      "name",
      "provider",
    ]);
    for (const forbidden of [
      "areaServed",
      "offers",
      "aggregateRating",
      "serviceType",
      "hasOfferCatalog",
    ]) {
      expect(data).not.toHaveProperty(forbidden);
    }
  });
});
