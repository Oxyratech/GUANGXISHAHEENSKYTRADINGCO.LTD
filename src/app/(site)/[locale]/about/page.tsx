import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AboutCta } from "@/components/company/about/AboutCta";
import { AboutGlance } from "@/components/company/about/AboutGlance";
import { AboutScope } from "@/components/company/about/AboutScope";
import { ApproachPrinciples } from "@/components/company/about/ApproachPrinciples";
import { BusinessFocus } from "@/components/company/about/BusinessFocus";
import { CompanyOverview } from "@/components/company/about/CompanyOverview";
import { GlobalVision } from "@/components/company/about/GlobalVision";
import { RegisteredSummary } from "@/components/company/about/RegisteredSummary";
import { COMPANY_NAME_VALUES } from "@/components/company/company-names";
import { companyPageJsonLd } from "@/components/company/page-json-ld";
import { DirectionalIcon } from "@/components/icons";
import { PageHero } from "@/components/layout/page-hero";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import { assertLocale } from "@/i18n/assert-locale";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";

const PATH = "/about";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "about" });
  return buildMetadata({
    locale,
    path: PATH,
    title: t("meta.title"),
    description: t("meta.description", { ...COMPANY_NAME_VALUES, location: t("location") }),
  });
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "about" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: common("nav.home"), path: "/" },
            { name: common("nav.about"), path: PATH },
          ]),
          companyPageJsonLd({
            type: "AboutPage",
            locale,
            path: PATH,
            name: t("meta.title"),
            description: t("meta.description", { ...COMPANY_NAME_VALUES, location: t("location") }),
          }),
        ]}
      />
      <PageHero
        tone="navy"
        size="expanded"
        breadcrumb={
          <Breadcrumb
            label={common("a11y.breadcrumb")}
            items={[{ label: common("nav.home"), href: "/" }, { label: common("nav.about") }]}
          />
        }
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
        actions={
          <>
            <ButtonLink href="/inquiry" variant="inverse" size="lg">
              {common("cta.sendInquiry")}
              <DirectionalIcon />
            </ButtonLink>
            <ButtonLink href="/company-information" variant="outline-inverse" size="lg">
              {common("nav.companyInformation")}
            </ButtonLink>
          </>
        }
        aside={<AboutGlance locale={locale} />}
      />
      <CompanyOverview locale={locale} />
      <BusinessFocus locale={locale} />
      <RegisteredSummary locale={locale} />
      <AboutScope locale={locale} />
      <ApproachPrinciples locale={locale} />
      <GlobalVision locale={locale} />
      <AboutCta locale={locale} />
    </>
  );
}
