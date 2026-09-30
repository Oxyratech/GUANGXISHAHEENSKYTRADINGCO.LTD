/*
 * Untrusted input of the news routes: the listing's query string and the article's slug segment.
 * Slugs are letters (any script, with combining marks), digits, hyphens and underscores. A value
 * that is not one is treated as absent, so junk never reaches the database or the cache keys.
 */
const slugPattern = (maxLength: number) =>
  new RegExp(`^[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}_-]{0,${maxLength - 1}}$`, "u");

/** Category and tag slugs are at most 80 characters, article slugs 160 (see the Prisma schema). */
const FILTER_SLUG = slugPattern(80);
const ARTICLE_SLUG = slugPattern(160);

/** Far beyond any real archive; keeps `?page=99999` from producing an absurd offset. */
const MAX_PAGE = 10_000;

export interface NewsListParams {
  page: number;
  category?: string;
  tag?: string;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function slugParam(value: string | string[] | undefined): string | undefined {
  const text = first(value)?.trim();
  return text && FILTER_SLUG.test(text) ? text : undefined;
}

function pageParam(value: string | string[] | undefined): number {
  const text = first(value)?.trim();
  if (!text || !/^\d{1,5}$/.test(text)) return 1;
  return Math.min(Math.max(Number.parseInt(text, 10), 1), MAX_PAGE);
}

/** The listing's query string, read defensively: an invalid value is the same as an absent one. */
export function parseNewsListParams(searchParams: RawSearchParams): NewsListParams {
  const category = slugParam(searchParams.category);
  const tag = slugParam(searchParams.tag);
  return {
    page: pageParam(searchParams.page),
    ...(category ? { category } : {}),
    ...(tag ? { tag } : {}),
  };
}

/**
 * The slug of an article route segment, percent-decoded when needed, or undefined when it cannot be
 * a stored slug (the page then answers 404 without a query).
 */
export function parseArticleSlug(segment: string): string | undefined {
  let slug = segment;
  if (segment.includes("%")) {
    try {
      slug = decodeURIComponent(segment);
    } catch {
      return undefined;
    }
  }
  return ARTICLE_SLUG.test(slug) ? slug : undefined;
}
