import { COMPANY } from "@/config/company";
import { SITE } from "@/config/site";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/i18n/locales";
import { COMPANY_DISPLAY_NAME } from "./constants";
import { absoluteUrl, localizedUrl } from "./urls";

/**
 * schema.org JSON-LD builders: pure functions returning plain objects, rendered by <JsonLd>.
 *
 * Only facts we hold are emitted. In particular there is deliberately no sameAs, areaServed, employee
 * count, revenue, award, rating or offer/price anywhere: none of that exists, and structured data
 * that claims it would be a false statement to search engines.
 */
export type JsonLdObject = { "@type": string; [property: string]: unknown };

const CONTEXT = "https://schema.org";

const organizationId = () => `${absoluteUrl("/")}#organization`;
const websiteId = (locale: Locale) => `${localizedUrl(locale, "/")}#website`;
const logoUrl = () => absoluteUrl("/brand/logo-mark.svg");
const isoString = (value: string | Date) => (value instanceof Date ? value.toISOString() : value);

export interface ContactChannels {
  email?: string | null;
  telephone?: string | null;
}

/**
 * The company as registered on its business license. `channels` are the public contact details from
 * site settings; none have been supplied yet, so without them no contactPoint is emitted.
 */
export function organizationJsonLd({
  channels,
}: { channels?: ContactChannels } = {}): JsonLdObject {
  const email = channels?.email?.trim();
  const telephone = channels?.telephone?.trim();

  return {
    "@context": CONTEXT,
    "@type": "Organization",
    "@id": organizationId(),
    name: COMPANY_DISPLAY_NAME,
    legalName: COMPANY.legalNameEn,
    alternateName: [COMPANY.legalNameZh, SITE.name],
    url: localizedUrl(DEFAULT_LOCALE, "/"),
    logo: logoUrl(),
    foundingDate: COMPANY.establishedOn,
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.registeredAddressZh,
      addressLocality: COMPANY.location.cityEn,
      addressRegion: COMPANY.location.regionEn,
      addressCountry: "CN",
    },
    identifier: {
      "@type": "PropertyValue",
      propertyID: "Unified Social Credit Code",
      value: COMPANY.unifiedSocialCreditCode,
    },
    ...(email || telephone
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "sales",
            ...(email ? { email } : {}),
            ...(telephone ? { telephone } : {}),
          },
        }
      : {}),
  };
}

/** No SearchAction: the site has no search yet. */
export function websiteJsonLd(locale: Locale): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    "@id": websiteId(locale),
    name: SITE.name,
    url: localizedUrl(locale, "/"),
    inLanguage: LOCALE_META[locale].htmlLang,
    publisher: { "@id": organizationId() },
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Pathname without the locale prefix. */
  path: string;
}

export function breadcrumbJsonLd(locale: Locale, items: readonly BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: localizedUrl(locale, item.path),
    })),
  };
}

export interface FaqEntry {
  question: string;
  /** Plain text. */
  answer: string;
}

export function faqPageJsonLd(entries: readonly FaqEntry[]): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export interface ProductJsonLdInput {
  locale: Locale;
  /** Pathname without the locale prefix. */
  path: string;
  name: string;
  description?: string;
  /** Absolute image URLs. */
  images?: readonly string[];
  /** Localised category name. */
  category?: string;
  specifications?: readonly { label: string; value: string }[];
}

/**
 * A catalogue entry, built only from the product record. There is no `offers`, price, availability,
 * brand or rating: this is a sourcing catalogue, not a shop, and none of those values exist.
 */
export function productJsonLd(input: ProductJsonLdInput): JsonLdObject {
  const { locale, path, name, description, images, category, specifications } = input;
  return {
    "@context": CONTEXT,
    "@type": "Product",
    name,
    url: localizedUrl(locale, path),
    inLanguage: LOCALE_META[locale].htmlLang,
    ...(description ? { description } : {}),
    ...(images && images.length > 0 ? { image: [...images] } : {}),
    ...(category ? { category } : {}),
    ...(specifications && specifications.length > 0
      ? {
          additionalProperty: specifications.map((spec) => ({
            "@type": "PropertyValue",
            name: spec.label,
            value: spec.value,
          })),
        }
      : {}),
  };
}

export interface NewsArticleJsonLdInput {
  locale: Locale;
  /** Pathname without the locale prefix. */
  path: string;
  headline: string;
  description: string;
  imageUrl?: string;
  /** Display byline. Without one the company is credited as the author. */
  authorName?: string | null;
  datePublished: string | Date;
  dateModified?: string | Date;
}

export function newsArticleJsonLd(input: NewsArticleJsonLdInput): JsonLdObject {
  const { locale, path, headline, description, imageUrl, authorName, datePublished, dateModified } =
    input;
  const url = localizedUrl(locale, path);
  const organization = {
    "@type": "Organization",
    "@id": organizationId(),
    name: COMPANY_DISPLAY_NAME,
  };

  return {
    "@context": CONTEXT,
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline,
    description,
    inLanguage: LOCALE_META[locale].htmlLang,
    datePublished: isoString(datePublished),
    ...(dateModified ? { dateModified: isoString(dateModified) } : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    author: authorName ? { "@type": "Person", name: authorName } : organization,
    publisher: { ...organization, logo: { "@type": "ImageObject", url: logoUrl() } },
  };
}

export interface ItemListEntry {
  name: string;
  /** Pathname without the locale prefix. */
  path: string;
}

function itemList(locale: Locale, items: readonly ItemListEntry[]): JsonLdObject {
  return {
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: localizedUrl(locale, item.path),
    })),
  };
}

export function itemListJsonLd(locale: Locale, items: readonly ItemListEntry[]): JsonLdObject {
  return { "@context": CONTEXT, ...itemList(locale, items) };
}

/** A listing page (category page, news index) and the items it lists. */
export function collectionPageJsonLd(input: {
  locale: Locale;
  path: string;
  name: string;
  description?: string;
  items: readonly ItemListEntry[];
}): JsonLdObject {
  const { locale, path, name, description, items } = input;
  return {
    "@context": CONTEXT,
    "@type": "CollectionPage",
    name,
    url: localizedUrl(locale, path),
    inLanguage: LOCALE_META[locale].htmlLang,
    isPartOf: { "@id": websiteId(locale) },
    ...(description ? { description } : {}),
    mainEntity: itemList(locale, items),
  };
}
