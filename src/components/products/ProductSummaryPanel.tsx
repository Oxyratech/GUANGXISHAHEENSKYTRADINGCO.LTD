import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { SmartLink } from "@/components/ui/smart-link";
import { getCategory } from "@/content/categories";
import type { Locale } from "@/i18n/locales";
import type { ProductDetail } from "@/server/products";

const HEADING_ID = "product-actions-heading";

/**
 * Key facts and the calls to action of a product page. It states what the page does not hold (no
 * price, minimum order quantity or lead time) and points the buyer to an inquiry instead: the
 * primary action asks for a quote on this product, the secondary one describes a need in the
 * category. Only facts stored on the product are shown.
 */
export async function ProductSummaryPanel({
  product,
  locale,
}: {
  product: ProductDetail;
  locale: Locale;
}) {
  const [t, common, categories] = await Promise.all([
    getTranslations({ locale, namespace: "products" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "categories" }),
  ]);
  const slug = encodeURIComponent(product.categorySlug);
  const quoteHref = `/inquiry?product=${encodeURIComponent(product.slug)}&category=${slug}`;

  return (
    <Card as="section" aria-labelledby={HEADING_ID} className="gap-6 p-6">
      <dl className="grid gap-4">
        <div className="grid gap-1">
          <dt className="text-caption text-ink-subtle">{t("detail.categoryLabel")}</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <SmartLink
              href={`/products/${product.categorySlug}`}
              className="text-label text-blue-700 underline-offset-4 hover:underline"
            >
              {categories(`${product.categorySlug}.name`)}
            </SmartLink>
            {getCategory(product.categorySlug)?.regulated ? (
              <Badge variant="gold">{t("regulated.badge")}</Badge>
            ) : null}
          </dd>
        </div>
        {product.origin ? (
          <div className="grid gap-1">
            <dt className="text-caption text-ink-subtle">{t("detail.originLabel")}</dt>
            <dd className="text-label text-navy-900">
              <bdi>{product.origin}</bdi>
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="grid gap-4 border-t border-line pt-6">
        <h2 id={HEADING_ID} className="text-h3 text-navy-900">
          {t("detail.actions.title")}
        </h2>
        <p className="text-small text-ink-muted">{t("detail.actions.note")}</p>
        <div className="grid gap-3">
          <ButtonLink href={quoteHref} size="lg">
            {common("cta.requestQuote")}
          </ButtonLink>
          <ButtonLink href={`/inquiry?category=${slug}`} variant="outline" size="lg">
            {t("detail.actions.sendBusinessInquiry")}
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}
