import { describe, expect, it } from "vitest";
import { BUSINESS_SCOPE_ITEMS, getScopeItem } from "@/config/business-scope";
import { CATEGORIES, CATEGORY_SLUGS } from "@/content/categories";
import { SERVICE_SLUGS, SERVICES, type ServiceSlug } from "@/content/services";
import {
  CTA_KEY,
  getAdjacentServices,
  getRelatedCategories,
  inquiryHref,
  RELATED_CATEGORIES,
  SUPPORTING_LINES,
} from "./service-config";

describe("registered scope references", () => {
  it.each(SERVICES)("$slug references only items that exist in the registry", (service) => {
    expect(service.scopeItemIds.length).toBeGreaterThan(0);
    expect(new Set(service.scopeItemIds).size).toBe(service.scopeItemIds.length);
    for (const id of service.scopeItemIds) {
      expect(getScopeItem(id), `${service.slug} -> ${id}`).toBeDefined();
    }
  });

  it("keeps the supporting lines on trade-agency items, not on product items", () => {
    const tradeItems = new Set(
      BUSINESS_SCOPE_ITEMS.filter((item) => item.group === "trade-services").map((item) => item.id),
    );
    for (const service of SERVICES.filter((entry) => SUPPORTING_LINES.has(entry.slug))) {
      expect(service.scopeItemIds.every((id) => tradeItems.has(id))).toBe(true);
    }
  });

  it("names the three lines that support trade agency", () => {
    expect([...SUPPORTING_LINES].sort()).toEqual([
      "business-procurement",
      "product-sourcing",
      "supplier-coordination",
    ]);
  });
});

describe("related categories", () => {
  it.each(SERVICE_SLUGS)("%s lists at least one registered category", (slug) => {
    const categories = getRelatedCategories(slug);
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) expect(CATEGORY_SLUGS).toContain(category.slug);
  });

  it("derives 'all' and 'regulated' from the category registry", () => {
    expect(getRelatedCategories("international-trading")).toHaveLength(CATEGORIES.length);
    const regulated = getRelatedCategories("import-export");
    expect(regulated.length).toBeGreaterThan(0);
    expect(regulated.every((category) => category.regulated)).toBe(true);
    expect(regulated.map((category) => category.slug).sort()).toEqual(
      CATEGORIES.filter((category) => category.regulated)
        .map((category) => category.slug)
        .sort(),
    );
  });

  it("only selects examples that are real categories, without repeats", () => {
    for (const slug of SERVICE_SLUGS) {
      const config = RELATED_CATEGORIES[slug];
      if (config.mode !== "examples") continue;
      expect(new Set(config.slugs).size).toBe(config.slugs.length);
      for (const category of config.slugs) expect(CATEGORY_SLUGS).toContain(category);
    }
  });
});

describe("call to action", () => {
  it("gives every line a primary wording from the brief", () => {
    expect(Object.keys(CTA_KEY).sort()).toEqual([...SERVICE_SLUGS].sort());
    for (const key of Object.values(CTA_KEY)) {
      expect([
        "sendInquiry",
        "sendBusinessInquiry",
        "requestQuote",
        "submitTradeInquiry",
      ]).toContain(key);
    }
  });

  it("links the inquiry form with the line as the only context", () => {
    expect(inquiryHref("import-export")).toBe("/inquiry?service=import-export");
  });
});

describe("getAdjacentServices", () => {
  it("has no previous line before the first and no next line after the last", () => {
    expect(getAdjacentServices(SERVICE_SLUGS[0]).previous).toBeNull();
    expect(getAdjacentServices(SERVICE_SLUGS[SERVICE_SLUGS.length - 1]).next).toBeNull();
  });

  it("walks the registry in order", () => {
    const visited: ServiceSlug[] = [SERVICE_SLUGS[0]];
    for (let next = getAdjacentServices(visited[0]!).next; next;) {
      visited.push(next);
      next = getAdjacentServices(next).next;
    }
    expect(visited).toEqual([...SERVICE_SLUGS]);
  });

  it("makes previous and next mirror each other", () => {
    for (const slug of SERVICE_SLUGS) {
      const { previous, next } = getAdjacentServices(slug);
      if (previous) expect(getAdjacentServices(previous).next).toBe(slug);
      if (next) expect(getAdjacentServices(next).previous).toBe(slug);
    }
  });
});
