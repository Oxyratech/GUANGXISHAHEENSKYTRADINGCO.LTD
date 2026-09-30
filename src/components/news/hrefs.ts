/** Articles per page of /news: a full 3-column grid. */
export const NEWS_PAGE_SIZE = 9;

export interface NewsListFilters {
  category?: string;
  tag?: string;
  /** 1-based; page 1 has no parameter, so it has one address. */
  page?: number;
}

/** Pathname (locale added by the link) of the news list with the given filters. */
export function newsListHref({ category, tag, page }: NewsListFilters = {}): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (tag) params.set("tag", tag);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/news?${query}` : "/news";
}

/** Pathname of an article. Slugs may be written in Chinese or Arabic, so they are encoded. */
export function newsArticlePath(slug: string): string {
  return `/news/${encodeURIComponent(slug)}`;
}
