import { getTranslations } from "next-intl/server";
import { WorldMap } from "@/components/graphics/WorldMap";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import type { Locale } from "@/i18n/locales";

/**
 * Global Vision: an aspiration, stated as a direction and not as current scale. The map is
 * decorative: it marks only Nanning, where the company is registered, and says so.
 */
export async function GlobalVision({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <Section tone="navy" aria-labelledby="vision-heading">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="grid content-start gap-6">
            <SectionHeading
              id="vision-heading"
              eyebrow={t("vision.eyebrow")}
              title={t("vision.title")}
            />
            <p className="text-body-lg text-blue-100">{t("vision.body")}</p>
            <p className="text-body text-blue-200">
              {t("vision.foundation", { location: t("location") })}
            </p>
          </div>
          <figure>
            <WorldMap tone="navy" highlightNanning />
            <figcaption className="mt-3 text-caption text-blue-200">
              {t("vision.mapCaption")}
            </figcaption>
          </figure>
        </div>
      </Container>
    </Section>
  );
}
