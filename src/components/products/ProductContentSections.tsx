import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import type { Locale } from "@/i18n/locales";
import type { ProductDetail } from "@/server/products";
import { DocumentList } from "./DocumentList";
import { ProductRichText } from "./ProductRichText";
import { SpecificationTable } from "./SpecificationTable";

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-4 text-h3 text-navy-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The body of a product page: description, applications and packaging on the reading side;
 * specifications and documents beside them. Every block appears only when the product has that
 * content, and the whole band is left out when it has none of it.
 */
export async function ProductContentSections({
  product,
  locale,
}: {
  product: ProductDetail;
  locale: Locale;
}) {
  const { description, applications, packagingInfo, specifications, documents } = product;
  const hasText = Boolean(description ?? applications ?? packagingInfo);
  const hasFacts = specifications.length > 0 || documents.length > 0;
  if (!hasText && !hasFacts) return null;

  const t = await getTranslations({ locale, namespace: "products" });
  const rich = (text: string) => (
    <ProductRichText text={text} contentLocale={product.contentLocale} locale={locale} />
  );

  return (
    <Section tone="muted">
      <Container>
        <div
          className={
            hasText && hasFacts
              ? "grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16"
              : "grid gap-12"
          }
        >
          {hasText ? (
            <div className="grid content-start gap-10">
              {description ? (
                <Block id="product-description" title={t("detail.sections.description")}>
                  {rich(description)}
                </Block>
              ) : null}
              {applications ? (
                <Block id="product-applications" title={t("detail.sections.applications")}>
                  {rich(applications)}
                </Block>
              ) : null}
              {packagingInfo ? (
                <Block id="product-packaging" title={t("detail.sections.packaging")}>
                  {rich(packagingInfo)}
                </Block>
              ) : null}
            </div>
          ) : null}
          {hasFacts ? (
            <div className="grid content-start gap-10">
              {specifications.length > 0 ? (
                <Block id="product-specifications" title={t("detail.sections.specifications")}>
                  <SpecificationTable
                    specifications={specifications}
                    name={product.name}
                    locale={locale}
                  />
                </Block>
              ) : null}
              {documents.length > 0 ? (
                <Block id="product-documents" title={t("detail.sections.documents")}>
                  <DocumentList
                    documents={documents}
                    name={product.name}
                    productSlug={product.slug}
                    locale={locale}
                  />
                </Block>
              ) : null}
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
