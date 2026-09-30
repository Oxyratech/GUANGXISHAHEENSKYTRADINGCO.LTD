import type { SeoScope } from "@/lib/domain/statuses";

export type { SeoScope } from "@/lib/domain/statuses";

/**
 * The editor's optional metadata override for one target (a static page, a category, a product or a
 * news article) in one locale, or null when there is none. Every field is independent: an editor may
 * set only a title, only a description, only the Open Graph image, or only "no index".
 */
export interface SeoOverride {
  title: string | null;
  description: string | null;
  noIndex: boolean;
  ogImage: { url: string; width: number | null; height: number | null } | null;
}

export interface SeoOverrideLookup {
  scope: SeoScope;
  refKey: string;
  locale: string;
}
