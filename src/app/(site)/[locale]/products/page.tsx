import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AvailabilityNote } from "@/components/products/AvailabilityNote";
import { CategoryCard } from "@/components/products/CategoryCard";
import { CategoryEmptyState } from "@/components/products/CategoryEmptyState";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductsUnavailableState } from "@/components/products/ProductsUnavailableState";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import { CATEGORY_SLUGS } from "@/content/categories";
import { assertLocale } from "@/i18n/assert-locale";
import { breadcrumbJsonLd, buildMetadata, collectionPageJsonLd, JsonLd } from "@/lib/seo";
import { countPublishedByCategory, listPublishedProducts } from "@/server/products";
import { toBreadcrumbItems, type Crumb } from "./_lib/breadcrumbs";
import { toListingState } from "./_lib/listing-state";
import { skipCacheWhenUnavailable } from "./_lib/render-policy";

// Re-read the catalogue every five minutes (must be a literal: PRODUCTS_REVALIDATE_SECONDS).
export const revalidate = 300;

/** Newest published products shown under the categories; each category page lists its own. */
const INDEX_PRODUCT_COUNT = 6;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/products">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "products" });
  return buildMetadata({
    locale,
    path: "/products",
    title: t("meta.title"),
    description: t("meta.description"),
  });
}

export default async function ProductsPage({ params }: PageProps<"/[locale]/products">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);

  const [t, common, categories, listing, counts] = await Promise.all([
    getTranslations({ locale, namespace: "products" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "categories" }),
    listPublishedProducts({ locale, page: 1, pageSize: INDEX_PRODUCT_COUNT }),
    countPublishedByCategory(locale),
  ]);
  await skipCacheWhenUnavailable(listing, counts);

  const state = toListingState(listing);
  const crumbs: Crumb[] = [
    { name: common("breadcrumb.home"), path: "/" },
    { name: common("nav.products"), path: "/products" },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, crumbs),
          collectionPageJsonLd({
            locale,
            path: "/products",
            name: t("index.title"),
            description: t("index.description"),
            items: CATEGORY_SLUGS.map((slug) => ({
              name: categories(`${slug}.name`),
              path: `/products/${slug}`,
            })),
          }),
        ]}
      />

      <PageHero
        size="expanded"
        eyebrow={t("index.eyebrow")}
        title={t("index.title")}
        description={t("index.description")}
        breadcrumb={
          <Breadcrumb label={common("a11y.breadcrumb")} items={toBreadcrumbItems(crumbs)} />
        }
        actions={
          <>
            <ButtonLink href="/inquiry" size="lg">
              {common("cta.sendInquiry")}
            </ButtonLink>
            <ButtonLink href="/global-trade/how-it-works" variant="outline" size="lg">
              {common("nav.tradeProcess")}
            </ButtonLink>
          </>
        }
        aside={<AvailabilityNote locale={locale} />}
      />

      <Section aria-labelledby="categories-heading">
        <Container>
          <SectionHeading
            id="categories-heading"
            title={t("index.categories.heading")}
            description={t("index.categories.description")}
          />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORY_SLUGS.map((slug) => (
              <li key={slug}>
                <CategoryCard
                  slug={slug}
                  locale={locale}
                  headingLevel={3}
                  productCount={counts.ok ? counts.data[slug] : undefined}
                />
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section tone="muted" aria-labelledby="published-heading">
        <Container>
          <SectionHeading
            id="published-heading"
            title={t("index.published.heading")}
            description={t("index.published.description")}
          />
          <div className="mt-10 grid gap-6">
            {state.kind === "unavailable" ? (
              <ProductsUnavailableState locale={locale} />
            ) : state.kind === "empty" ? (
              <CategoryEmptyState locale={locale} />
            ) : (
              <>
                <ProductGrid products={state.page.items} locale={locale} showCategory />
                {state.page.total > state.page.items.length ? (
                  <p className="text-small text-ink-muted">
                    {t("index.published.more", {
                      shown: state.page.items.length,
                      total: state.page.total,
                    })}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </Container>
      </Section>

      <Section tone="navy" spacing="compact">
        <Container>
          <Reveal className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <SectionHeading
              title={t("index.closing.title")}
              description={t("index.closing.description")}
            />
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/inquiry" variant="inverse" size="lg">
                {common("cta.sendInquiry")}
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline-inverse" size="lg">
                {common("cta.contactUs")}
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
