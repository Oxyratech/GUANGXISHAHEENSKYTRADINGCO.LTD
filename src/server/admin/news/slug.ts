import "server-only";
import type { Locale } from "@/i18n/locales";
import { getDb } from "@/server/db";

export { isValidNewsSlug, suggestSlugFromTitle } from "./slugify";

/** True when another article already uses `slug` in `locale` (excluding `excludeId`, for an update). */
export async function isNewsSlugTaken(
  locale: Locale,
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const existing = await getDb().newsArticle.findFirst({
    where: { locale, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return existing !== null;
}
