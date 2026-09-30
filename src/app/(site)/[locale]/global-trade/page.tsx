import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WorldMap } from "@/components/graphics/WorldMap";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { BriefSection } from "@/components/trade/BriefSection";
import { ComplianceSection } from "@/components/trade/ComplianceSection";
import { DocumentsSection } from "@/components/trade/DocumentsSection";
import { ProcessTimeline } from "@/components/trade/ProcessTimeline";
import { ShippingSection } from "@/components/trade/ShippingSection";
import { SupportSection } from "@/components/trade/SupportSection";
import { TradeCtaBand } from "@/components/trade/TradeCtaBand";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button-link";
import { assertLocale } from "@/i18n/assert-locale";
import { breadcrumbJsonLd, buildMetadata, JsonLd } from "@/lib/seo";
import { applySeoOverride, getSeoOverride } from "@/server/seo";

const PATH = "/global-trade";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/global-trade">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "globalTrade" });
  const metadata = buildMetadata({
    locale,
    path: PATH,
    title: t("meta.title"),
    description: t("meta.description"),
  });
  return applySeoOverride(metadata, await getSeoOverride({ scope: "PAGE", refKey: "global-trade", locale }));
}

export default async function GlobalTradePage({ params }: PageProps<"/[locale]/global-trade">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "globalTrade" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const trail = [
    { label: common("breadcrumb.home"), href: "/" },
    { label: common("nav.globalTrade") },
  ];

  return (
    <>
      <PageHero
        tone="navy"
        size="expanded"
        breadcrumb={<Breadcrumb label={common("a11y.breadcrumb")} items={trail} />}
        eyebrow={t("overview.eyebrow")}
        title={t("overview.title")}
        description={t("overview.description")}
        actions={
          <>
            <ButtonLink href="/inquiry" variant="inverse" size="lg">
              {common("cta.sendInquiry")}
              <DirectionalIcon />
            </ButtonLink>
            <ButtonLink href="/global-trade/how-it-works" variant="outline-inverse" size="lg">
              {common("nav.tradeProcess")}
            </ButtonLink>
          </>
        }
        aside={
          <figure className="rounded-lg border border-white/15 bg-navy-800/50 p-5">
            <WorldMap tone="navy" highlightNanning />
            <figcaption className="mt-4 text-small text-blue-100">
              {t("overview.mapCaption")}
            </figcaption>
          </figure>
        }
      />

      <SupportSection locale={locale} />
      <BriefSection locale={locale} />

      <Section aria-labelledby="process-title">
        <Container>
          <SectionHeading
            id="process-title"
            eyebrow={t("overview.process.eyebrow")}
            title={t("overview.process.title")}
            description={t("overview.process.description")}
          />
          <div className="mt-12">
            <ProcessTimeline variant="compact" locale={locale} />
          </div>
          <div className="mt-10">
            <ButtonLink href="/global-trade/how-it-works" variant="outline">
              {t("overview.process.cta")}
              <DirectionalIcon />
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <DocumentsSection locale={locale} />
      <ShippingSection locale={locale} />
      <ComplianceSection locale={locale} />
      <TradeCtaBand locale={locale} source="overview" />

      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: common("breadcrumb.home"), path: "/" },
          { name: common("nav.globalTrade"), path: PATH },
        ])}
      />
    </>
  );
}
