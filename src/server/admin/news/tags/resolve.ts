import "server-only";
import { LOCALES } from "@/i18n/locales";
import { getDb } from "@/server/db";

/** Same slugging rule as news article slugs: lower-case ASCII, hyphen-separated. */
function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 80);
}

/**
 * The article editor's "create tags inline": each typed name becomes an existing tag (matched by its
 * slug) or a brand-new one. A newly created tag gets the typed text as its name in every locale — the
 * only text the editor gave it — and can be given proper zh/ar wording later from the tag management
 * screen (this is inline convenience, not full localisation).
 */
export async function resolveTagIdsByNames(names: readonly string[]): Promise<string[]> {
  const db = getDb();
  const trimmed = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (trimmed.length === 0) return [];

  const bySlug = new Map(trimmed.map((name) => [slugify(name), name]));
  const slugs = [...bySlug.keys()];

  const existing = await db.newsTag.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const foundSlugs = new Set(existing.map((tag) => tag.slug));
  const ids = existing.map((tag) => tag.id);

  for (const slug of slugs) {
    if (foundSlugs.has(slug)) continue;
    const name = bySlug.get(slug);
    if (!name) continue;
    const created = await db.newsTag.create({
      data: { slug, translations: { create: LOCALES.map((locale) => ({ locale, name })) } },
      select: { id: true },
    });
    ids.push(created.id);
  }

  return ids;
}
