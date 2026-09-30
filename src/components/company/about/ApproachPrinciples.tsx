import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { RevealStagger } from "@/components/motion/reveal-stagger";
import { ButtonLink } from "@/components/ui/button-link";
import type { Locale } from "@/i18n/locales";

const PRINCIPLES = ["requirements", "verification", "communication", "documentation"] as const;

/**
 * Our Approach: how the company intends to work. Framed as intent throughout; the note under the
 * list says these are not certifications, promises of outcome or a record of completed orders.
 */
export async function ApproachPrinciples({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <Section aria-labelledby="approach-heading">
      <Container>
        <SectionHeading
          id="approach-heading"
          eyebrow={t("approach.eyebrow")}
          title={t("approach.title")}
          description={t("approach.description")}
        />
        <RevealStagger
          as="ol"
          className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4"
        >
          {PRINCIPLES.map((principle, index) => (
            <li key={principle} className="border-t-2 border-gold-400 pt-5">
              <p aria-hidden className="text-eyebrow text-ink-subtle">
                <bdi>{String(index + 1).padStart(2, "0")}</bdi>
              </p>
              <h3 className="mt-3 text-h3 text-navy-900">
                {t(`approach.principles.${principle}.title`)}
              </h3>
              <p className="mt-3 text-body text-ink-muted">
                {t(`approach.principles.${principle}.body`)}
              </p>
            </li>
          ))}
        </RevealStagger>
        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <p className="max-w-2xl text-small text-ink-muted">{t("approach.note")}</p>
          <ButtonLink
            href="/global-trade/how-it-works"
            variant="outline"
            className="shrink-0 self-start sm:self-auto"
          >
            {t("approach.processLink")}
            <DirectionalIcon />
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
