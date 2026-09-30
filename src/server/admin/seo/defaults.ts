import "server-only";
import { getTranslations } from "next-intl/server";
import { SERVICE_SLUGS } from "@/content/services";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { logger } from "@/lib/logger";
import type { Namespace } from "@/i18n/namespaces";
import { getDb, toDatabaseError } from "@/server/db";

/*
 * A best-effort preview of the title/description a public page would show when no override exists,
 * for the SEO editor's "what the default would be" panel. It reads the same message keys the page's
 * own generateMetadata reads, but with `t.raw` (no ICU interpolation): a handful of pages fill their
 * description with values such as the company's registered name or the visitor's own product
 * category, which this preview cannot recreate, so the raw message is close but not pixel-identical
 * to what generateMetadata would return. It is a preview, never the value that is actually applied.
 */

interface PageMetaKeys {
  ns: Namespace;
  title: string;
  description: string;
}

const SERVICE_META_KEYS: Record<string, PageMetaKeys> = Object.fromEntries(
  SERVICE_SLUGS.map((slug) => [
    `business/${slug}`,
    { ns: "business", title: `pages.${slug}.meta.title`, description: `pages.${slug}.meta.description` },
  ]),
);

const PAGE_META_KEYS: Record<string, PageMetaKeys> = {
  home: { ns: "home", title: "meta.title", description: "meta.description" },
  about: { ns: "about", title: "meta.title", description: "meta.description" },
  business: { ns: "business", title: "meta.title", description: "meta.description" },
  ...SERVICE_META_KEYS,
  products: { ns: "products", title: "meta.title", description: "meta.description" },
  "global-trade": { ns: "globalTrade", title: "meta.title", description: "meta.description" },
  "global-trade/how-it-works": {
    ns: "globalTrade",
    title: "howItWorks.meta.title",
    description: "howItWorks.meta.description",
  },
  "company-information": { ns: "companyInfo", title: "meta.title", description: "meta.description" },
  news: { ns: "news", title: "meta.title", description: "meta.description" },
  faq: { ns: "faq", title: "meta.title", description: "meta.description" },
  contact: { ns: "contact", title: "meta.title", description: "meta.description" },
  inquiry: { ns: "inquiry", title: "meta.title", description: "meta.description" },
  "privacy-policy": { ns: "legal", title: "privacy.meta.title", description: "privacy.meta.description" },
  terms: { ns: "legal", title: "terms.meta.title", description: "terms.meta.description" },
  cookies: { ns: "legal", title: "cookies.meta.title", description: "cookies.meta.description" },
};

export interface DefaultMetaPreview {
  title: string | null;
  description: string | null;
}

const EMPTY_PREVIEW: DefaultMetaPreview = { title: null, description: null };

type Translator = Awaited<ReturnType<typeof getTranslations>>;

// Message keys are typed against each namespace's own key tree; these previews look one up by a
// dynamic string built from admin-entered data (a page key, a category slug), so the strict key type
// is deliberately widened back to `string` here, at the one boundary that needs it.
function rawOrNull(t: Translator, key: string): string | null {
  try {
    const value = t.raw(key as Parameters<Translator["raw"]>[0]);
    return typeof value === "string" && value.trim() ? value : null;
  } catch {
    return null;
  }
}

/** For a PAGE-scoped target: the raw title/description message, or null when the page key is unknown. */
export async function getDefaultPageMetaPreview(
  refKey: string,
  locale: Locale,
): Promise<DefaultMetaPreview> {
  const keys = PAGE_META_KEYS[refKey];
  if (!keys) return EMPTY_PREVIEW;
  try {
    const t = await getTranslations({ locale, namespace: keys.ns });
    return { title: rawOrNull(t, keys.title), description: rawOrNull(t, keys.description) };
  } catch (error) {
    logger.warn("admin.seo.default_preview_failed", { refKey, locale, error });
    return EMPTY_PREVIEW;
  }
}

/**
 * For a PRODUCT-scoped target: the product's own name/short description in that locale (falling back
 * to English, the way the public catalogue does), not a message catalogue — a product has no
 * generateMetadata of its own to preview, only its content. `refKey` is the product's slug: the same
 * key the public product page already reads its override by (see @/server/products/seo-override).
 */
export async function getDefaultProductMetaPreview(
  slug: string,
  locale: Locale,
): Promise<DefaultMetaPreview> {
  try {
    const product = await getDb().product.findUnique({
      where: { slug },
      select: { translations: { select: { locale: true, name: true, shortDescription: true } } },
    });
    if (!product) return EMPTY_PREVIEW;
    const row =
      product.translations.find((t) => t.locale === locale) ??
      (locale !== DEFAULT_LOCALE
        ? product.translations.find((t) => t.locale === DEFAULT_LOCALE)
        : undefined);
    return { title: row?.name ?? null, description: row?.shortDescription ?? null };
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/**
 * For a NEWS-scoped target: the article's own title/summary. A news row already carries exactly one
 * locale (see @/server/admin/seo/queries's getSeoEditorContext), so there is nothing to fall back to.
 */
export async function getDefaultNewsMetaPreview(articleId: string): Promise<DefaultMetaPreview> {
  try {
    const article = await getDb().newsArticle.findUnique({
      where: { id: articleId },
      select: { title: true, summary: true },
    });
    return article ? { title: article.title, description: article.summary } : EMPTY_PREVIEW;
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/** For a CATEGORY-scoped target: the category name is interpolated exactly; the rest is raw. */
export async function getDefaultCategoryMetaPreview(
  refKey: string,
  locale: Locale,
): Promise<DefaultMetaPreview> {
  try {
    const [categories, products] = await Promise.all([
      getTranslations({ locale, namespace: "categories" }),
      getTranslations({ locale, namespace: "products" }),
    ]);
    type CategoriesT = Awaited<ReturnType<typeof getTranslations<"categories">>>;
    const key = (suffix: string) => `${refKey}.${suffix}` as Parameters<CategoriesT>[0];
    const name = categories(key("name"));
    const summary = categories(key("summary"));
    const titleRaw = rawOrNull(products, "category.meta.title");
    const descriptionRaw = rawOrNull(products, "category.meta.description");
    return {
      title: titleRaw ? titleRaw.replace("{name}", name) : null,
      description: descriptionRaw ? descriptionRaw.replace("{summary}", summary) : null,
    };
  } catch (error) {
    logger.warn("admin.seo.default_preview_failed", { refKey, locale, error });
    return EMPTY_PREVIEW;
  }
}
