import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryLinkGrid } from "@/components/business/CategoryLinkGrid";
import { CtaBand } from "@/components/business/CtaBand";
import { HeroIllustration } from "@/components/business/blocks";
import { ProcessTeaser } from "@/components/business/ProcessTeaser";
import { ScopeMatrix } from "@/components/business/ScopeMatrix";
import { ServiceCard } from "@/components/business/ServiceCard";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import { SmartLink } from "@/components/ui/smart-link";
import { CATEGORIES } from "@/content/categories";
import { SERVICE_SLUGS } from "@/content/services";
import { assertLocale } from "@/i18n/assert-locale";
import { breadcrumbJsonLd, buildMetadata, collectionPageJsonLd, JsonLd } from "@/lib/seo";
import { applySeoOverride, getSeoOverride } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/business">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "business" });
  const metadata = buildMetadata({
    locale,
    path: "/business",
    title: t("meta.title"),
    description: t("meta.description"),
  });
  return applySeoOverride(metadata, await getSeoOverride({ scope: "PAGE", refKey: "business", locale }));
}

const POINTS = ["direct", "supporting", "categories"] as const;

export default async function BusinessPage({ params }: PageProps<"/[locale]/business">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);

  const [t, common, services, categoryNotes] = await Promise.all([
    getTranslations({ locale, namespace: "business" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "services" }),
    getTranslations({ locale, namespace: "categories" }),
  ]);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: common("breadcrumb.home"), path: "/" },
            { name: common("nav.business"), path: "/business" },
          ]),
          collectionPageJsonLd({
            locale,
            path: "/business",
            name: t("index.hero.title"),
            description: t("meta.description"),
            items: SERVICE_SLUGS.map((slug) => ({
              name: services(`${slug}.name`),
              path: `/business/${slug}`,
            })),
          }),
        ]}
      />

      <PageHero
        tone="navy"
        size="expanded"
        eyebrow={t("index.hero.eyebrow")}
        title={t("index.hero.title")}
        description={t("index.hero.description")}
        breadcrumb={
          <Breadcrumb
            label={common("a11y.breadcrumb")}
            items={[
              { label: common("breadcrumb.home"), href: "/" },
              { label: common("nav.business") },
            ]}
          />
        }
        actions={
          <>
            <ButtonLink href="/inquiry" variant="inverse" size="lg">
              {t("shared.cta.sendInquiry")}
              <DirectionalIcon />
            </ButtonLink>
            <ButtonLink href="/products" variant="outline-inverse" size="lg">
              {common("cta.browseProducts")}
            </ButtonLink>
          </>
        }
        aside={
          <HeroIllustration variant="sourcing" tone="navy" alt={t("index.hero.illustration")} />
        }
      />

      <Section aria-labelledby="business-lines-title">
        <Container>
          <SectionHeading
            id="business-lines-title"
            eyebrow={t("index.lines.eyebrow")}
            title={t("index.lines.title")}
            description={t("index.lines.description")}
          />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_SLUGS.map((slug) => (
              <li key={slug} className="flex">
                <ServiceCard slug={slug} locale={locale} />
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section tone="muted" aria-labelledby="business-relation-title">
        <Container>
          <SectionHeading
            id="business-relation-title"
            eyebrow={t("index.relation.eyebrow")}
            title={t("index.relation.title")}
            description={t.rich("index.relation.description", {
              scopeLink: (chunks) => (
                <SmartLink
                  href="/company-information"
                  className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:decoration-blue-700"
                >
                  {chunks}
                </SmartLink>
              ),
            })}
          />
          <ul className="mt-12 grid gap-8 md:grid-cols-3">
            {POINTS.map((point) => (
              <li key={point} className="border-s-2 border-gold-400 ps-5">
                <h3 className="text-h3 text-navy-900">
                  {t(`index.relation.points.${point}.title`)}
                </h3>
                <p className="mt-2 text-body text-ink-muted">
                  {t(`index.relation.points.${point}.text`)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <ScopeMatrix locale={locale} />
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="business-products-title">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              id="business-products-title"
              eyebrow={t("index.products.eyebrow")}
              title={t("index.products.title")}
              description={t("index.products.description", { count: CATEGORIES.length })}
            />
            <ButtonLink href="/products" variant="outline">
              {common("cta.browseProducts")}
              <DirectionalIcon />
            </ButtonLink>
          </div>
          <Reveal className="mt-10">
            <CategoryLinkGrid locale={locale} categories={CATEGORIES} dense />
          </Reveal>
          <p className="mt-8 max-w-3xl text-small text-ink-muted">
            {categoryNotes("availabilityNote")}
          </p>
        </Container>
      </Section>

      <ProcessTeaser locale={locale} />

      <CtaBand
        headingId="business-cta-title"
        title={t("index.cta.title")}
        description={t("index.cta.description")}
        primary={{ label: t("shared.cta.sendInquiry"), href: "/inquiry" }}
        secondary={{ label: common("cta.contactUs"), href: "/contact" }}
      />
    </>
  );
}
