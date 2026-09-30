import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import type { Locale } from "@/i18n/locales";

/** Closing band of the Global Trade pages: the inquiry form first, the FAQ as the quieter option. */
export async function TradeCtaBand({
  locale,
  source,
}: {
  locale: Locale;
  /** The globalTrade section that holds this page's `cta` copy. */
  source: "overview" | "howItWorks";
}) {
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "globalTrade" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const titleId = `${source}-cta-title`;

  return (
    <Section tone="navy" aria-labelledby={titleId}>
      <Container>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
          <SectionHeading
            id={titleId}
            title={t(`${source}.cta.title`)}
            description={t(`${source}.cta.description`)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/inquiry" variant="inverse" size="lg">
              {common("cta.requestQuote")}
              <DirectionalIcon />
            </ButtonLink>
            <ButtonLink href="/faq" variant="outline-inverse" size="lg">
              {t("readFaq")}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}
