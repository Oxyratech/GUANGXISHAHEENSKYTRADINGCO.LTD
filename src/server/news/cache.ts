/**
 * Cache tag on everything derived from news rows. Whoever writes news (the admin area) must expire
 * it afterwards, the way the settings service does: `revalidateTag(NEWS_CACHE_TAG, { expire: 0 })`.
 */
export const NEWS_CACHE_TAG = "news";

/** Published news is re-read at most this often when nothing invalidates the tag. */
export const NEWS_REVALIDATE_SECONDS = 300;
