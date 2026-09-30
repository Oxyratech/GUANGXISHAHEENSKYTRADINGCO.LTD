import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { TRADE_PROCESS_STEPS } from "@/content/process";
import type { Locale } from "@/i18n/locales";

/**
 * A short look at the typical trade process, labelled as typical. The full page is
 * /global-trade/how-it-works; the step names here are this section's own short labels.
 */
export async function ProcessTeaser({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "business" });

  return (
    <Section tone="muted" aria-labelledby="business-process-title">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="business-process-title"
            eyebrow={t("index.process.eyebrow")}
            title={t("index.process.title")}
            description={t("index.process.description")}
          />
          <ButtonLink href="/global-trade/how-it-works" variant="outline">
            {t("index.process.cta")}
            <DirectionalIcon />
          </ButtonLink>
        </div>
        <Reveal as="ol" className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRADE_PROCESS_STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-4 rounded-lg border border-line bg-white p-4 shadow-card"
            >
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-md bg-navy-900 text-label text-white"
              >
                <bdi>{index + 1}</bdi>
              </span>
              <span className="text-label text-navy-900">{t(`index.process.steps.${step}`)}</span>
            </li>
          ))}
        </Reveal>
      </Container>
    </Section>
  );
}
