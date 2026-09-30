import { getTranslations } from "next-intl/server";
import { DirectionalIcon, Icon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { RevealStagger } from "@/components/motion/reveal-stagger";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardDescription, CardHeader, CardLink, CardTitle } from "@/components/ui/card";
import type { IconName } from "@/content/categories";
import type { ServiceSlug } from "@/content/services";
import type { Locale } from "@/i18n/locales";

/** The three areas of support, each pointing at the business page that describes it in depth. */
const PILLARS = [
  { id: "sourcing", icon: "PackageSearch", href: "/business/product-sourcing" },
  { id: "coordination", icon: "Handshake", href: "/business/supplier-coordination" },
  { id: "logistics", icon: "Ship", href: "/business/import-export" },
] as const satisfies readonly { id: string; icon: IconName; href: `/business/${ServiceSlug}` }[];

export async function SupportSection({ locale }: { locale: Locale }) {
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "globalTrade" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  return (
    <Section aria-labelledby="support-title">
      <Container>
        <SectionHeading
          id="support-title"
          eyebrow={t("overview.support.eyebrow")}
          title={t("overview.support.title")}
          description={t("overview.support.description")}
        />
        <RevealStagger as="ul" role="list" className="mt-12 grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <Card as="li" interactive key={pillar.id}>
              <CardHeader className="gap-3">
                <span className="flex size-11 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                  <Icon name={pillar.icon} />
                </span>
                <CardTitle as="h3">
                  <CardLink href={pillar.href}>
                    {t(`overview.support.pillars.${pillar.id}.title`)}
                    <DirectionalIcon className="ms-2 inline size-4 align-[-0.125em]" />
                  </CardLink>
                </CardTitle>
                <CardDescription className="text-body">
                  {t(`overview.support.pillars.${pillar.id}.description`)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </RevealStagger>
        <div className="mt-10">
          <ButtonLink href="/business" variant="outline">
            {common("cta.exploreBusiness")}
            <DirectionalIcon />
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
