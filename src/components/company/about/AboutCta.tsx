import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import type { Locale } from "@/i18n/locales";

/** Closing call to action of the About page. */
export async function AboutCta({ locale }: { locale: Locale }) {
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "about" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  return (
    <Section tone="muted" spacing="compact" aria-labelledby="about-cta-heading">
      <Container size="narrow">
        <div className="grid justify-items-center gap-8">
          <SectionHeading
            id="about-cta-heading"
            align="center"
            title={t("cta.title")}
            description={t("cta.description")}
          />
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/inquiry" size="lg">
              {common("cta.sendInquiry")}
              <DirectionalIcon />
            </ButtonLink>
            <ButtonLink href="/business" variant="outline" size="lg">
              {common("cta.exploreBusiness")}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </Section>
  );
}
