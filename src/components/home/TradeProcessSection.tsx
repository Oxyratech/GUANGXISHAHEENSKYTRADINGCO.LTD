import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ProcessTimeline } from "@/components/trade/ProcessTimeline";
import { ButtonLink } from "@/components/ui/button-link";
import type { Locale } from "@/i18n/locales";

/** How Trade Works: the compact eight-step timeline, with a link to the full explanation. */
export async function TradeProcessSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <Section tone="muted" aria-labelledby="home-process-title">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="home-process-title"
            eyebrow={t("process.eyebrow")}
            title={t("process.title")}
            description={t("process.description")}
          />
          <ButtonLink href="/global-trade/how-it-works" variant="outline">
            {t("process.cta")}
            <DirectionalIcon />
          </ButtonLink>
        </div>
        <div className="mt-12">
          <ProcessTimeline variant="compact" headingLevel={3} locale={locale} />
        </div>
      </Container>
    </Section>
  );
}
