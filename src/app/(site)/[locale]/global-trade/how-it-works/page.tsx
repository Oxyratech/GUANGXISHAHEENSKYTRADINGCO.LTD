import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { NotesSection } from "@/components/trade/NotesSection";
import { ProcessTimeline } from "@/components/trade/ProcessTimeline";
import { StepJumpList } from "@/components/trade/StepJumpList";
import { TradeCtaBand } from "@/components/trade/TradeCtaBand";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import { DirectionalIcon } from "@/components/icons";
import { assertLocale } from "@/i18n/assert-locale";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";

const PATH = "/global-trade/how-it-works";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/global-trade/how-it-works">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "globalTrade" });
  return buildMetadata({
    locale,
    path: PATH,
    title: t("howItWorks.meta.title"),
    description: t("howItWorks.meta.description"),
  });
}

export default async function HowItWorksPage({
  params,
}: PageProps<"/[locale]/global-trade/how-it-works">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "globalTrade" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const trail = [
    { label: common("breadcrumb.home"), href: "/" },
    { label: common("nav.globalTrade"), href: "/global-trade" },
    { label: common("nav.tradeProcess") },
  ];

  return (
    <>
      <PageHero
        size="expanded"
        breadcrumb={<Breadcrumb label={common("a11y.breadcrumb")} items={trail} />}
        eyebrow={t("howItWorks.eyebrow")}
        title={t("howItWorks.title")}
        description={t("howItWorks.description")}
        actions={
          <>
            <ButtonLink href="/inquiry" size="lg">
              {common("cta.sendInquiry")}
              <DirectionalIcon />
            </ButtonLink>
            <ButtonLink href="/faq" variant="outline" size="lg">
              {t("readFaq")}
            </ButtonLink>
          </>
        }
        aside={<StepJumpList locale={locale} />}
      />

      <Section aria-labelledby="steps-title">
        <Container>
          <SectionHeading
            id="steps-title"
            title={t("howItWorks.stepsTitle")}
            description={t("howItWorks.stepsDescription")}
          />
          <div className="mt-14">
            <ProcessTimeline variant="detailed" headingLevel={3} locale={locale} />
          </div>
        </Container>
      </Section>

      <NotesSection locale={locale} />
      <TradeCtaBand locale={locale} source="howItWorks" />

      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: common("breadcrumb.home"), path: "/" },
          { name: common("nav.globalTrade"), path: "/global-trade" },
          { name: common("nav.tradeProcess"), path: PATH },
        ])}
      />
    </>
  );
}
