import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BusinessScopeDetail } from "@/components/company/BusinessScopeDetail";
import { COMPANY_NAME_VALUES } from "@/components/company/company-names";
import { LicenseDocument } from "@/components/company/LicenseDocument";
import { companyPageJsonLd } from "@/components/company/page-json-ld";
import { RegistrationFacts } from "@/components/company/RegistrationFacts";
import { VerifyRegistration } from "@/components/company/VerifyRegistration";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import { assertLocale } from "@/i18n/assert-locale";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";

const PATH = "/company-information";

/** In-page targets, in reading order. */
const ANCHORS = [
  { key: "registration", href: "#registration" },
  { key: "license", href: "#business-license" },
  { key: "scope", href: "#business-scope" },
] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/company-information">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "companyInfo" });
  return buildMetadata({
    locale,
    path: PATH,
    title: t("meta.title"),
    description: t("meta.description", COMPANY_NAME_VALUES),
  });
}

export default async function CompanyInformationPage({
  params,
}: PageProps<"/[locale]/company-information">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "companyInfo" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: common("nav.home"), path: "/" },
            { name: common("nav.companyInformation"), path: PATH },
          ]),
          companyPageJsonLd({
            type: "WebPage",
            locale,
            path: PATH,
            name: t("meta.title"),
            description: t("meta.description", COMPANY_NAME_VALUES),
          }),
        ]}
      />
      <PageHero
        breadcrumb={
          <Breadcrumb
            label={common("a11y.breadcrumb")}
            items={[
              { label: common("nav.home"), href: "/" },
              { label: common("nav.companyInformation") },
            ]}
          />
        }
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
        actions={
          <nav aria-label={t("hero.onThisPage")} className="flex flex-wrap gap-3">
            {ANCHORS.map(({ key, href }) => (
              <ButtonLink key={key} href={href} variant="outline" size="sm">
                {t(`hero.anchors.${key}`)}
              </ButtonLink>
            ))}
          </nav>
        }
      />

      <Section id="registration" aria-labelledby="registration-heading">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <SectionHeading
              id="registration-heading"
              eyebrow={t("registration.eyebrow")}
              title={t("registration.title")}
              description={t("registration.description")}
              className="self-start lg:col-span-4"
            />
            <div className="lg:col-span-8">
              <RegistrationFacts locale={locale} />
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="muted" id="business-license" aria-labelledby="license-heading">
        <Container>
          <SectionHeading
            id="license-heading"
            eyebrow={t("license.eyebrow")}
            title={t("license.title")}
            description={t("license.description")}
          />
          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <LicenseDocument locale={locale} />
            </div>
            <div className="lg:col-span-5">
              <VerifyRegistration locale={locale} />
            </div>
          </div>
        </Container>
      </Section>

      <BusinessScopeDetail locale={locale} />
    </>
  );
}
