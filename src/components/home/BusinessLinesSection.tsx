import { getTranslations } from "next-intl/server";
import { ServiceCard } from "@/components/business/ServiceCard";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import { SERVICE_SLUGS } from "@/content/services";
import type { Locale } from "@/i18n/locales";

/** What We Do: the six business lines, each linking to its own page. */
export async function BusinessLinesSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <Section aria-labelledby="home-business-title">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="home-business-title"
            eyebrow={t("business.eyebrow")}
            title={t("business.title")}
            description={t("business.description")}
          />
          <ButtonLink href="/business" variant="outline">
            {t("business.cta")}
            <DirectionalIcon />
          </ButtonLink>
        </div>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_SLUGS.map((slug) => (
            <li key={slug} className="flex">
              <ServiceCard slug={slug} locale={locale} />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
