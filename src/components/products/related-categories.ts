import { CATEGORY_SLUGS, type CategorySlug } from "@/content/categories";

/**
 * The categories that follow `slug` in the registry (wrapping around), for the "other categories"
 * strip. The registry orders categories by the scope groups, so neighbours are near in subject; it
 * is navigation, not a claim that the categories are related in any commercial sense.
 */
export function getNeighbourCategories(slug: CategorySlug, count = 3): CategorySlug[] {
  const start = CATEGORY_SLUGS.indexOf(slug);
  const others = CATEGORY_SLUGS.length - 1;
  if (start === -1 || others < 1) return [];
  return Array.from(
    { length: Math.min(count, others) },
    (_, offset) => CATEGORY_SLUGS[(start + 1 + offset) % CATEGORY_SLUGS.length],
  );
}
