import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrackOnMount } from "@/components/analytics/TrackOnMount";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { AlternateLocalePaths } from "@/components/site/alternate-locale-paths";
import { contentLanguageProps } from "@/components/products/content-language";
import { OtherCategories } from "@/components/products/OtherCategories";
import { ProductContentSections } from "@/components/products/ProductContentSections";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductsUnavailableState } from "@/components/products/ProductsUnavailableState";
import { ProductSummaryPanel } from "@/components/products/ProductSummaryPanel";
import { Alert } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getCategory } from "@/content/categories";
import { assertLocale } from "@/i18n/assert-locale";
import { absoluteUrl, breadcrumbJsonLd, buildMetadata, JsonLd, productJsonLd } from "@/lib/seo";
import { getPublishedProduct, getSeoOverride } from "@/server/products";
import { productPathsForHreflang, productPathsForSwitcher } from "../../_lib/alternate-paths";
import { toBreadcrumbItems, type Crumb } from "../../_lib/breadcrumbs";
import { skipCacheWhenUnavailable } from "../../_lib/render-policy";
import { toSeoImage } from "../../_lib/seo-image";
import { toMetaDescription } from "../../_lib/text";

// Products are read on demand and then cached like static pages, for five minutes (a literal: it
// mirrors PRODUCTS_REVALIDATE_SECONDS). Nothing is prerendered: the catalogue does not exist at
// build time and the build must never need a database. A product that is not published is a 404.
export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/products/[category]/[product]">): Promise<Metadata> {
  const { locale: rawLocale, category, product: slug } = await params;
  const locale = assertLocale(rawLocale);
  setRequestLocale(locale);

  const result = await getPublishedProduct({ locale, categorySlug: category, slug });
  // Without a database nothing is published and the page answers 404, like any missing product.
  // With an unreachable one the page is an error state, which a crawler must not index.
  if (!result.ok) {
    return result.cause === "not_configured" ? {} : { robots: { index: false, follow: false } };
  }
  const product = result.data;
  if (!product) return {};

  const [t, categories, override] = await Promise.all([
    getTranslations({ locale, namespace: "products" }),
    getTranslations({ locale, namespace: "categories" }),
    getSeoOverride({ scope: "PRODUCT", refKey: product.slug, locale }),
  ]);
  const path = `/products/${product.categorySlug}/${product.slug}`;
  const description =
    override?.description ??
    (product.shortDescription
      ? toMetaDescription(product.shortDescription)
      : t("detail.meta.fallbackDescription", {
          name: product.name,
          category: categories(`${product.categorySlug}.name`),
        }));

  const image = override?.ogImage
    ? toSeoImage(
        override.ogImage.url,
        product.name,
        override.ogImage.width,
        override.ogImage.height,
      )
    : product.image
      ? toSeoImage(product.image.src, product.image.alt, product.image.width, product.image.height)
      : undefined;

  return buildMetadata({
    locale,
    path,
    title: override?.title ?? product.name,
    description,
    image,
    // English text on another language's URL is a duplicate of the English page.
    noIndex: override?.noIndex || product.contentLocale !== locale,
    alternatePaths: productPathsForHreflang(product.translatedLocales, path),
  });
}

export default async function ProductPage({
  params,
}: PageProps<"/[locale]/products/[category]/[product]">) {
  const { locale: rawLocale, category, product: slug } = await params;
  const locale = assertLocale(rawLocale);
  setRequestLocale(locale);

  const result = await getPublishedProduct({ locale, categorySlug: category, slug });
  await skipCacheWhenUnavailable(result);

  if (!result.ok && result.cause !== "not_configured") {
    return (
      <Section>
        <Container size="narrow">
          <ProductsUnavailableState locale={locale} titleAs="h1" />
        </Container>
      </Section>
    );
  }
  // No database means nothing can be published: the address does not exist.
  const product = result.ok ? result.data : null;
  const definition = product ? getCategory(product.categorySlug) : undefined;
  if (!product || !definition) notFound();

  const [t, common, categories] = await Promise.all([
    getTranslations({ locale, namespace: "products" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "categories" }),
  ]);

  const categoryName = categories(`${definition.slug}.name`);
  const categoryPath = `/products/${definition.slug}`;
  const productPath = `${categoryPath}/${product.slug}`;
  const crumbs: Crumb[] = [
    { name: common("breadcrumb.home"), path: "/" },
    { name: common("nav.products"), path: "/products" },
    { name: categoryName, path: categoryPath },
    { name: product.name, path: productPath },
  ];
  const language = contentLanguageProps(product.contentLocale, locale);

  return (
    <>
      <AlternateLocalePaths
        paths={productPathsForSwitcher(product.translatedLocales, productPath, categoryPath)}
      />
      <TrackOnMount
        event="product_view"
        props={{ product: product.slug, category: definition.slug, locale }}
      />
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, crumbs),
          productJsonLd({
            locale,
            path: productPath,
            name: product.name,
            description: product.shortDescription ?? undefined,
            images: product.images.map((image) => absoluteUrl(image.src)),
            category: categoryName,
            specifications: product.specifications,
          }),
        ]}
      />

      <PageHero
        eyebrow={categoryName}
        title={<span {...language}>{product.name}</span>}
        description={
          product.shortDescription ? <span {...language}>{product.shortDescription}</span> : null
        }
        breadcrumb={
          <Breadcrumb label={common("a11y.breadcrumb")} items={toBreadcrumbItems(crumbs)} />
        }
      />

      <Section spacing="compact">
        <Container>
          {product.contentLocale !== locale ? (
            <Alert variant="info" title={t("detail.translationNotice.title")} className="mb-8">
              {t("detail.translationNotice.body")}
            </Alert>
          ) : null}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-14">
            <ProductGallery images={product.images} name={product.name} locale={locale} />
            <ProductSummaryPanel product={product} locale={locale} />
          </div>
        </Container>
      </Section>

      <ProductContentSections product={product} locale={locale} />

      {product.related.length > 0 ? (
        <Section aria-labelledby="related-products-heading">
          <Container>
            <SectionHeading
              id="related-products-heading"
              title={t("detail.sections.related", { category: categoryName })}
            />
            <ProductGrid products={product.related} locale={locale} className="mt-10" />
          </Container>
        </Section>
      ) : null}

      <OtherCategories
        slug={definition.slug}
        locale={locale}
        title={t("detail.sections.relatedCategories")}
        headingId="other-categories-heading"
      />
    </>
  );
}
