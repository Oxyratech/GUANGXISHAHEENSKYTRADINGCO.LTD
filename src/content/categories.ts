import { getScopeItemsByGroup, SCOPE_GROUPS, type ScopeGroup } from "@/config/business-scope";

/**
 * Product categories, structured around the registered business scope (see config/business-scope).
 *
 * A category is an area the company is *registered* to trade in. It is NOT a claim that any product
 * in it is currently stocked or published. Localised names/descriptions live in the `categories`
 * i18n namespace, keyed by slug.
 *
 * `regulated` marks categories whose goods commonly need licences, filings or approvals under
 * Chinese law; the UI shows a compliance note for them. It says nothing about which approvals the
 * company holds.
 */
export type CategorySlug = Exclude<ScopeGroup, "trade-services">;

/** Lucide icon component names (resolved in components/icons). */
export type IconName =
  | "Gift"
  | "Shirt"
  | "Wheat"
  | "House"
  | "Blocks"
  | "PaintRoller"
  | "Wrench"
  | "Cable"
  | "Cog"
  | "Layers"
  | "Mountain"
  | "ShieldPlus"
  | "Ship"
  | "Globe"
  | "PackageSearch"
  | "Handshake"
  | "ClipboardList"
  | "ArrowLeftRight";

export interface CategoryDefinition {
  readonly slug: CategorySlug;
  readonly icon: IconName;
  readonly regulated: boolean;
}

export const CATEGORIES: readonly CategoryDefinition[] = [
  { slug: "consumer-goods", icon: "Gift", regulated: false },
  { slug: "apparel-accessories", icon: "Shirt", regulated: false },
  { slug: "food-products", icon: "Wheat", regulated: true },
  { slug: "household-products", icon: "House", regulated: false },
  { slug: "building-materials", icon: "Blocks", regulated: false },
  { slug: "decorative-materials", icon: "PaintRoller", regulated: false },
  { slug: "hardware-products", icon: "Wrench", regulated: false },
  { slug: "electrical-products", icon: "Cable", regulated: false },
  { slug: "machinery-equipment", icon: "Cog", regulated: false },
  { slug: "metal-products", icon: "Layers", regulated: false },
  { slug: "minerals-ores", icon: "Mountain", regulated: true },
  { slug: "medical-protective-supplies", icon: "ShieldPlus", regulated: true },
] as const;

export const CATEGORY_SLUGS: readonly CategorySlug[] = CATEGORIES.map((c) => c.slug);

export function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function getCategory(slug: string): CategoryDefinition | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Registered scope items backing a category. */
export function getCategoryScopeItems(slug: CategorySlug) {
  return getScopeItemsByGroup(slug);
}

// Compile-time guard: every non-trade scope group has a category (and vice versa).
const _exhaustive: Record<CategorySlug, true> = Object.fromEntries(
  SCOPE_GROUPS.filter((g) => g !== "trade-services").map((g) => [g, true]),
) as Record<CategorySlug, true>;
void _exhaustive;
