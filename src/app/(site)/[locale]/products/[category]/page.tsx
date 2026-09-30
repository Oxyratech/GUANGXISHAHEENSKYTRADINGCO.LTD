import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Icon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { AvailabilityNote } from "@/components/products/AvailabilityNote";
import { CategoryEmptyState } from "@/components/products/CategoryEmptyState";
import { CategoryScopeList } from "@/components/products/CategoryScopeList";
import { OtherCategories } from "@/components/products/OtherCategories";
import { parsePageParam } from "@/components/products/pagination";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductPagination } from "@/components/products/ProductPagination";
import { ProductsUnavailableState } from "@/components/products/ProductsUnavailableState";
import { RegulatedNote } from "@/components/products/RegulatedNote";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import { CATEGORY_SLUGS, getCategory } from "@/content/categories";
import { assertLocale } from "@/i18n/assert-locale";
import {
  breadcrumbJsonLd,
  buildMetadata,
  collectionPageJsonLd,
  JsonLd,
  localizedUrl,
} from "@/lib/seo";
import { getSeoOverride, listPublishedProducts, PRODUCTS_PAGE_SIZE } from "@/server/products";
import { toBreadcrumbItems, type Crumb } from "../_lib/breadcrumbs";
import { toListingState } from "../_lib/listing-state";
import { toSeoImage } from "../_lib/seo-image";

// The twelve categories are the registry: any other slug is a 404 without touching the database.
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((category) => ({ category }));
}

// Pagination reads `?page=` (searchParams), so this route renders per request. The database read
// behind it is cached for five minutes (see @/server/products), so a request costs one cache hit.

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/products/[category]">): Promise<Metadata> {
  const { locale: rawLocale, category: slug } = await params;
  const locale = assertLocale(rawLocale);
  setRequestLocale(locale);
  const definition = getCategory(slug);
  if (!definition) notFound();

  const page = parsePageParam((await searchParams).page);
  const [t, categories, override] = await Promise.all([
    getTranslations({ locale, namespace: "products" }),
    getTranslations({ locale, namespace: "categories" }),
    getSeoOverride({ scope: "CATEGORY", refKey: definition.slug, locale }),
  ]);

  const name = categories(`${definition.slug}.name`);
  const baseTitle = override?.title ?? t("category.meta.title", { name });
  const path = `/products/${definition.slug}`;
  const metadata = buildMetadata({
    locale,
    path,
    title: page > 1 ? t("category.meta.pageTitle", { title: baseTitle, page }) : baseTitle,
    description:
      override?.description ??
      t("category.meta.description", { summary: categories(`${definition.slug}.summary`) }),
    image: override?.ogImage
      ? toSeoImage(override.ogImage.url, name, override.ogImage.width, override.ogImage.height)
      : undefined,
    noIndex: override?.noIndex,
  });

  // A later page is its own address; it must not claim to be the first page or its translations.
  return page > 1
    ? { ...metadata, alternates: { canonical: `${localizedUrl(locale, path)}?page=${page}` } }
    : metadata;
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/products/[category]">) {
  const { locale: rawLocale, category: slug } = await params;
  const locale = assertLocale(rawLocale);
  setRequestLocale(locale);
  const definition = getCategory(slug);
  if (!definition) notFound();

  const page = parsePageParam((await searchParams).page);
  const [t, common, categories, listing] = await Promise.all([
    getTranslations({ locale, namespace: "products" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "categories" }),
    listPublishedProducts({
      locale,
      categorySlug: definition.slug,
      page,
      pageSize: PRODUCTS_PAGE_SIZE,
    }),
  ]);

  const name = categories(`${definition.slug}.name`);
  const basePath = `/products/${definition.slug}`;
  const state = toListingState(listing);
  const crumbs: Crumb[] = [
    { name: common("breadcrumb.home"), path: "/" },
    { name: common("nav.products"), path: "/products" },
    { name, path: basePath },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, crumbs),
          ...(state.kind === "products"
            ? [
                collectionPageJsonLd({
                  locale,
                  path: basePath,
                  name,
                  description: categories(`${definition.slug}.summary`),
                  items: state.page.items.map((product) => ({
                    name: product.name,
                    path: `/products/${product.categorySlug}/${product.slug}`,
                  })),
                }),
              ]
            : []),
        ]}
      />

      <PageHero
        tone="navy"
        size="expanded"
        eyebrow={t("category.eyebrow")}
        title={name}
        description={categories(`${definition.slug}.description`)}
        breadcrumb={
          <Breadcrumb label={common("a11y.breadcrumb")} items={toBreadcrumbItems(crumbs)} />
        }
        actions={
          <ButtonLink
            href={`/inquiry?category=${encodeURIComponent(definition.slug)}`}
            variant="inverse"
            size="lg"
          >
            {common("cta.sendInquiry")}
          </ButtonLink>
        }
        aside={
          <div
            aria-hidden
            className="hidden size-36 place-items-center rounded-lg border border-white/15 bg-white/5 text-gold-300 lg:grid"
          >
            <Icon name={definition.icon} size={56} strokeWidth={1.25} />
          </div>
        }
      />

      <Section aria-labelledby="scope-heading">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
            <div className="grid content-start gap-6">
              <SectionHeading
                id="scope-heading"
                title={t("category.scope.heading")}
                description={categories(`${definition.slug}.scopeIntro`)}
              />
              {definition.regulated ? <RegulatedNote locale={locale} /> : null}
              <AvailabilityNote locale={locale} />
            </div>
            <CategoryScopeList slug={definition.slug} locale={locale} />
          </div>
        </Container>
      </Section>

      <Section tone="muted" aria-labelledby="products-heading">
        <Container>
          <SectionHeading
            id="products-heading"
            title={t("category.products.heading")}
            description={t("category.products.description")}
          />
          <div className="mt-10 grid gap-8">
            {state.kind === "unavailable" ? (
              <ProductsUnavailableState locale={locale} />
            ) : state.kind === "empty" ? (
              <CategoryEmptyState locale={locale} categorySlug={definition.slug} />
            ) : (
              <>
                <p className="text-small text-ink-muted">
                  {t("category.products.summary", {
                    from: (state.page.page - 1) * state.page.pageSize + 1,
                    to: (state.page.page - 1) * state.page.pageSize + state.page.items.length,
                    total: state.page.total,
                  })}
                </p>
                <ProductGrid products={state.page.items} locale={locale} />
                <ProductPagination
                  locale={locale}
                  page={state.page.page}
                  pageCount={state.page.pageCount}
                  basePath={basePath}
                />
              </>
            )}
          </div>
        </Container>
      </Section>

      <OtherCategories
        slug={definition.slug}
        locale={locale}
        title={t("category.others.heading")}
        headingId="others-heading"
      />
    </>
  );
}
