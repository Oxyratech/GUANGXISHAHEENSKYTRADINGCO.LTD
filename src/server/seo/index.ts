import "server-only";

export {
  applySeoOverride,
  getSeoOverride,
  pageKeyFromPath,
  SEO_CACHE_TAG,
  SEO_REVALIDATE_SECONDS,
  SEO_SCOPES,
  type SeoScope,
} from "./overrides";
export type { SeoOverride, SeoOverrideLookup } from "./types";
