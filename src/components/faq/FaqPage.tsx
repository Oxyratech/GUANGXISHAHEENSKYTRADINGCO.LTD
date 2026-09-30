import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import type { Locale } from "@/i18n/locales";
import { breadcrumbJsonLd, faqPageJsonLd, JsonLd } from "@/lib/seo";
import { FaqAccordion } from "./FaqAccordion";
import { getFaqContent } from "./faq-content";
import { FaqGroupNav } from "./FaqGroupNav";

/** The /faq page body: hero, topic navigation beside the accordion, closing call to action. */
export async function FaqPage({ locale }: { locale: Locale }) {
  const [t, common, { groups, entries }] = await Promise.all([
    getTranslations({ locale, namespace: "faq" }),
    getTranslations({ locale, namespace: "common" }),
    getFaqContent(locale),
  ]);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(locale, [
            { name: common("breadcrumb.home"), path: "/" },
            { name: common("nav.faq"), path: "/faq" },
          ]),
          faqPageJsonLd(entries),
        ]}
      />
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
        breadcrumb={
          <Breadcrumb
            label={common("a11y.breadcrumb")}
            items={[{ label: common("breadcrumb.home"), href: "/" }, { label: common("nav.faq") }]}
          />
        }
      />

      <Section spacing="compact">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[16rem_minmax(0,1fr)]">
            <FaqGroupNav
              label={t("nav.label")}
              title={t("nav.title")}
              groups={groups}
              className="lg:sticky lg:top-28 lg:self-start"
            />
            <div className="min-w-0">
              <FaqAccordion groups={groups} />
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="navy" aria-labelledby="faq-cta-title">
        <Container>
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12">
            <SectionHeading
              id="faq-cta-title"
              title={t("cta.title")}
              description={t("cta.description")}
            />
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/inquiry" variant="inverse" size="lg">
                {t("cta.primary")}
                <DirectionalIcon />
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline-inverse" size="lg">
                {t("cta.secondary")}
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
