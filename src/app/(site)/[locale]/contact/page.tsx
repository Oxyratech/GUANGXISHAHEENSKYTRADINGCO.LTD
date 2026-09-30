import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactChannels } from "@/components/forms/pages/ContactChannels";
import { ContactCompanyCard } from "@/components/forms/pages/ContactCompanyCard";
import { ContactLocationCard } from "@/components/forms/pages/ContactLocationCard";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { SmartLink } from "@/components/ui/smart-link";
import { COMPANY } from "@/config/company";
import { assertLocale } from "@/i18n/assert-locale";
import { LOCALE_META } from "@/i18n/locales";
import { getCountryOptions } from "@/lib/countries";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildMetadata,
  COMPANY_DISPLAY_NAME,
  JsonLd,
  localizedUrl,
} from "@/lib/seo";
import { applySeoOverride, getSeoOverride } from "@/server/seo";
import { getPublicContactChannels } from "@/server/settings";

const PATH = "/contact";

const nameValues = { name: COMPANY_DISPLAY_NAME, nameZh: COMPANY.legalNameZh };

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "contact" });
  const metadata = buildMetadata({
    locale,
    path: PATH,
    title: t("meta.title"),
    description: t("meta.description", nameValues),
  });
  return applySeoOverride(metadata, await getSeoOverride({ scope: "PAGE", refKey: "contact", locale }));
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [t, common, channels] = await Promise.all([
    getTranslations({ locale, namespace: "contact" }),
    getTranslations({ locale, namespace: "common" }),
    getPublicContactChannels(),
  ]);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: common("nav.home"), path: "/" },
            { name: t("page.breadcrumb"), path: PATH },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: t("meta.title"),
            url: localizedUrl(locale, PATH),
            inLanguage: LOCALE_META[locale].htmlLang,
            about: { "@id": `${absoluteUrl("/")}#organization` },
          },
        ]}
      />
      <PageHero
        tone="navy"
        size="expanded"
        breadcrumb={
          <Breadcrumb
            label={common("a11y.breadcrumb")}
            items={[
              { label: common("breadcrumb.home"), href: "/" },
              { label: t("page.breadcrumb") },
            ]}
          />
        }
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        description={t("page.lead")}
        actions={
          <>
            <ButtonLink href="/inquiry" variant="inverse" size="lg">
              {t("inquiry.cta")}
              <DirectionalIcon />
            </ButtonLink>
            <ButtonLink href="#contact-form" variant="outline-inverse" size="lg">
              {t("channels.formLink")}
            </ButtonLink>
          </>
        }
      />

      <ContactChannels locale={locale} channels={channels} />

      <Section tone="navy" spacing="compact" aria-labelledby="contact-inquiry-title">
        <Container>
          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12">
            <SectionHeading
              id="contact-inquiry-title"
              title={t("inquiry.title")}
              description={t("inquiry.body")}
            />
            <ButtonLink href="/inquiry" variant="inverse" size="lg" className="justify-self-start">
              {t("inquiry.cta")}
              <DirectionalIcon />
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Section tone="muted">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <ContactCompanyCard locale={locale} />
            <ContactLocationCard locale={locale} />
          </div>
        </Container>
      </Section>

      <Section id="contact-form" aria-labelledby="contact-form-title" className="scroll-mt-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
            <SectionHeading
              id="contact-form-title"
              title={t("form.title")}
              description={t.rich("form.lead", {
                link: (chunks) => (
                  <SmartLink
                    href="/inquiry"
                    className="text-blue-600 underline underline-offset-4 hover:text-blue-800"
                  >
                    {chunks}
                  </SmartLink>
                ),
              })}
            />
            <Card className="p-5 sm:p-8">
              <ContactForm locale={locale} countries={getCountryOptions(locale)} />
            </Card>
          </div>
        </Container>
      </Section>
    </>
  );
}
