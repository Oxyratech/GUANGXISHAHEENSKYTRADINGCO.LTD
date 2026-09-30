import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBand } from "@/components/business/CtaBand";
import { BusinessLinesSection } from "@/components/home/BusinessLinesSection";
import { CompanyInfoSection } from "@/components/home/CompanyInfoSection";
import { ContactSection } from "@/components/home/ContactSection";
import { CredibilityStrip } from "@/components/home/CredibilityStrip";
import { HomeHero } from "@/components/home/HomeHero";
import { ProductCategoriesSection } from "@/components/home/ProductCategoriesSection";
import { SourcingBriefSection } from "@/components/home/SourcingBriefSection";
import { TradeProcessSection } from "@/components/home/TradeProcessSection";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { assertLocale } from "@/i18n/assert-locale";
import { buildMetadata } from "@/lib/seo";
import { applySeoOverride, getSeoOverride } from "@/server/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "home" });
  // buildMetadata prepends the full company name on the home path automatically.
  const metadata = buildMetadata({
    locale,
    path: "/",
    title: t("meta.title"),
    description: t("meta.description"),
  });
  return applySeoOverride(
    metadata,
    await getSeoOverride({ scope: "PAGE", refKey: "home", locale }),
  );
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });

  // The locale layout owns the single top-level landmark region; a page renders only its content.
  return (
    <>
      <HomeHero locale={locale} />
      <CredibilityStrip locale={locale} />
      <BusinessLinesSection locale={locale} />
      <ProductCategoriesSection locale={locale} />
      <SourcingBriefSection locale={locale} />
      <TradeProcessSection locale={locale} />
      <WhyUsSection locale={locale} />
      <CtaBand
        headingId="home-cta-title"
        title={t("cta.title")}
        description={t("cta.description")}
        primary={{ label: t("cta.primary"), href: "/inquiry" }}
        secondary={{ label: t("cta.secondary"), href: "/contact" }}
      />
      <CompanyInfoSection locale={locale} />
      <ContactSection locale={locale} />
    </>
  );
}
