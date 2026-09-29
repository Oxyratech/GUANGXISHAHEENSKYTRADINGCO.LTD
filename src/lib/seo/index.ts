export { buildMetadata, formatTitle, type BuildMetadataInput, type SeoImage } from "./metadata";
export {
  absoluteUrl,
  alternatesFor,
  alternatesForPaths,
  localizedPath,
  localizedUrl,
  type LanguageAlternates,
  type PathsByLocale,
} from "./urls";
export { ogImageUrl } from "./og-image";
export { COMPANY_DISPLAY_NAME } from "./constants";
export {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  faqPageJsonLd,
  itemListJsonLd,
  newsArticleJsonLd,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
  type BreadcrumbItem,
  type ContactChannels,
  type FaqEntry,
  type ItemListEntry,
  type JsonLdObject,
  type NewsArticleJsonLdInput,
  type ProductJsonLdInput,
} from "./json-ld";
export { JsonLd } from "./JsonLd";
