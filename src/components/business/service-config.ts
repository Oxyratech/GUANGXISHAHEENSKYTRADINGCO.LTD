import { CATEGORIES, type CategoryDefinition, type CategorySlug } from "@/content/categories";
import {
  getService,
  SERVICE_SLUGS,
  type ServiceDefinition,
  type ServiceSlug,
} from "@/content/services";
import type { Messages } from "@/i18n/messages";

/**
 * Page-level decisions for the business section that do not belong in the shared service registry
 * (content/services.ts): which call to action each line leads with, which registered categories a
 * line shows, and how the lines follow one another.
 */

/** Keys of `business.shared.cta`. All four are wordings the brief prescribes for a primary action. */
export type CtaKey = keyof Messages["business"]["shared"]["cta"];

export const CTA_KEY: Record<ServiceSlug, CtaKey> = {
  "international-trading": "sendInquiry",
  "import-export": "submitTradeInquiry",
  "product-sourcing": "sendInquiry",
  "supplier-coordination": "sendBusinessInquiry",
  "business-procurement": "requestQuote",
  "cross-border-trade": "submitTradeInquiry",
};

/**
 * Lines that support trade agency instead of being registered items of their own (see the note in
 * content/services.ts). Their pages say so next to the scope items.
 */
export const SUPPORTING_LINES: ReadonlySet<ServiceSlug> = new Set([
  "product-sourcing",
  "supplier-coordination",
  "business-procurement",
]);

/**
 * Which registered categories a line lists. "all" and "regulated" are derived from the category
 * registry; "examples" is an editorial selection and never a limit: the page says so.
 */
export type RelatedCategoriesConfig =
  | { readonly mode: "all" }
  | { readonly mode: "regulated" }
  | { readonly mode: "examples"; readonly slugs: readonly CategorySlug[] };

export const RELATED_CATEGORIES: Record<ServiceSlug, RelatedCategoriesConfig> = {
  "international-trading": { mode: "all" },
  "import-export": { mode: "regulated" },
  "product-sourcing": { mode: "all" },
  "supplier-coordination": {
    mode: "examples",
    slugs: [
      "apparel-accessories",
      "consumer-goods",
      "household-products",
      "electrical-products",
      "machinery-equipment",
    ],
  },
  "business-procurement": {
    mode: "examples",
    slugs: [
      "building-materials",
      "decorative-materials",
      "electrical-products",
      "hardware-products",
      "machinery-equipment",
      "metal-products",
    ],
  },
  "cross-border-trade": {
    mode: "examples",
    slugs: ["consumer-goods", "apparel-accessories", "household-products", "hardware-products"],
  },
};

export function getRelatedCategories(slug: ServiceSlug): readonly CategoryDefinition[] {
  const config = RELATED_CATEGORIES[slug];
  switch (config.mode) {
    case "all":
      return CATEGORIES;
    case "regulated":
      return CATEGORIES.filter((category) => category.regulated);
    case "examples":
      return CATEGORIES.filter((category) => config.slugs.includes(category.slug));
  }
}

/** The registry entry of a slug that the type system already guarantees exists. */
export function serviceDefinition(slug: ServiceSlug): ServiceDefinition {
  const service = getService(slug);
  if (!service) throw new Error(`Unknown business line: ${slug}`);
  return service;
}

export interface AdjacentServices {
  readonly previous: ServiceSlug | null;
  readonly next: ServiceSlug | null;
}

/** Neighbours in registry order. The first line has no previous one and the last no next one. */
export function getAdjacentServices(slug: ServiceSlug): AdjacentServices {
  const index = SERVICE_SLUGS.indexOf(slug);
  return {
    previous: SERVICE_SLUGS[index - 1] ?? null,
    next: SERVICE_SLUGS[index + 1] ?? null,
  };
}

/** Path of the inquiry form for a line; the slug is the only context passed, and it is not sensitive. */
export function inquiryHref(slug: ServiceSlug): string {
  return `/inquiry?service=${slug}`;
}
