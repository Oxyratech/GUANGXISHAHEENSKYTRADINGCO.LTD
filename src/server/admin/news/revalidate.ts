import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { LOCALES } from "@/i18n/locales";
import { NEWS_CACHE_TAG } from "@/server/news";

/*
 * Every public URL a news write can affect, revalidated together (docs/ARCHITECTURE.md: call both
 * revalidateTag and revalidatePath after an admin write). `slugs` should list every slug this write
 * touched in this locale — the old one and the new one, when a slug changed.
 */
export function revalidateNewsPublicPages(locale: string, slugs: readonly string[] = []): void {
  revalidatePath(`/${locale}/news`);
  for (const slug of slugs) revalidatePath(`/${locale}/news/${slug}`);
}

export function revalidateNewsAdminPages(id?: string): void {
  revalidatePath("/admin/news");
  if (id) revalidatePath(`/admin/news/${id}`);
}

/** Call after every write that can change what a visitor sees. */
export function revalidateNews(id: string | undefined, locale: string, slugs: readonly string[] = []) {
  revalidateTag(NEWS_CACHE_TAG, { expire: 0 });
  revalidateNewsAdminPages(id);
  revalidateNewsPublicPages(locale, slugs);
}

/** Every locale, for a change (like a category rename) that is not tied to one article's own locale. */
export function revalidateNewsEveryLocale(): void {
  revalidateTag(NEWS_CACHE_TAG, { expire: 0 });
  revalidateNewsAdminPages();
  for (const locale of LOCALES) revalidatePath(`/${locale}/news`);
}
