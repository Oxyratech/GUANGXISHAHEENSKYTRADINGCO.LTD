import type { IconName } from "./categories";

/**
 * The six business lines, each with a dedicated page at /business/<slug>. Localised copy lives in the
 * `services` i18n namespace, keyed by slug.
 *
 * `scopeItemIds` lists the registered scope items each line relates to. Product sourcing, supplier
 * coordination and procurement are described as activities that support the registered
 * trade-agency and import/export scope; they are never presented as separate licensed scope items.
 */
export const SERVICE_SLUGS = [
  "international-trading",
  "import-export",
  "product-sourcing",
  "supplier-coordination",
  "business-procurement",
  "cross-border-trade",
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

export interface ServiceDefinition {
  readonly slug: ServiceSlug;
  readonly icon: IconName;
  readonly scopeItemIds: readonly string[];
}

export const SERVICES: readonly ServiceDefinition[] = [
  {
    slug: "international-trading",
    icon: "Globe",
    scopeItemIds: ["goods-import-export", "import-export-agency", "domestic-trade-agency"],
  },
  {
    slug: "import-export",
    icon: "Ship",
    scopeItemIds: ["goods-import-export", "import-export-agency", "food-import-export"],
  },
  {
    slug: "product-sourcing",
    icon: "PackageSearch",
    scopeItemIds: ["domestic-trade-agency", "import-export-agency"],
  },
  {
    slug: "supplier-coordination",
    icon: "Handshake",
    scopeItemIds: ["domestic-trade-agency", "import-export-agency"],
  },
  {
    slug: "business-procurement",
    icon: "ClipboardList",
    scopeItemIds: ["domestic-trade-agency", "import-export-agency", "goods-import-export"],
  },
  {
    slug: "cross-border-trade",
    icon: "ArrowLeftRight",
    scopeItemIds: ["goods-import-export", "import-export-agency", "internet-sales"],
  },
] as const;

export function isServiceSlug(value: string): value is ServiceSlug {
  return (SERVICE_SLUGS as readonly string[]).includes(value);
}

export function getService(slug: string): ServiceDefinition | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
