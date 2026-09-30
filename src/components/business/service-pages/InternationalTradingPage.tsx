import { getTranslations } from "next-intl/server";
import { Icon, Landmark } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Card, CardDescription, CardHeader, CardLink, CardTitle } from "@/components/ui/card";
import type { ServiceSlug } from "@/content/services";
import type { Locale } from "@/i18n/locales";
import type { Messages } from "@/i18n/messages";
import { CheckList, HeroIllustration } from "../blocks";
import { serviceDefinition } from "../service-config";
import { ServicePageFrame } from "../ServicePageFrame";

const SLUG = "international-trading";

/** Capability cards: each points to the page that covers it. Trade agency itself is a registered item. */
type CapabilityKey =
  keyof Messages["business"]["pages"]["international-trading"]["capabilities"]["items"];

const CAPABILITIES: readonly { key: CapabilityKey; href: string; service?: ServiceSlug }[] = [
  { key: "tradeAgency", href: "/company-information" },
  { key: "sourcing", href: "/business/product-sourcing", service: "product-sourcing" },
  { key: "suppliers", href: "/business/supplier-coordination", service: "supplier-coordination" },
  { key: "procurement", href: "/business/business-procurement", service: "business-procurement" },
  { key: "importExport", href: "/business/import-export", service: "import-export" },
  { key: "crossBorder", href: "/business/cross-border-trade", service: "cross-border-trade" },
];

const NEEDS = ["products", "countries", "frequency", "requirements"] as const;

/** Overview page: what the umbrella covers, then the six-part capability grid that links onward. */
export async function InternationalTradingPage({ locale }: { locale: Locale }) {
  const [t, shared] = await Promise.all([
    getTranslations({ locale, namespace: `business.pages.${SLUG}` }),
    getTranslations({ locale, namespace: "business.shared" }),
  ]);

  return (
    <ServicePageFrame
      locale={locale}
      slug={SLUG}
      tone="navy"
      size="expanded"
      aside={<HeroIllustration variant="shipment" tone="navy" alt={shared("illustration")} />}
    >
      <Section aria-labelledby="it-overview-title">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <SectionHeading id="it-overview-title" title={t("overview.title")} />
            </div>
            <div className="grid content-start gap-5 text-body-lg text-ink-muted lg:col-span-7">
              <p>{t("overview.p1")}</p>
              <p>{t("overview.p2")}</p>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="muted" aria-labelledby="it-capabilities-title">
        <Container>
          <SectionHeading
            id="it-capabilities-title"
            eyebrow={t("capabilities.eyebrow")}
            title={t("capabilities.title")}
            description={t("capabilities.description")}
          />
          <Reveal as="ul" className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map(({ key, href, service }) => (
              <li key={key} className="flex">
                <Card interactive className="w-full">
                  <CardHeader className="gap-4">
                    <span
                      aria-hidden
                      className="grid size-11 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700"
                    >
                      {service ? (
                        <Icon name={serviceDefinition(service).icon} />
                      ) : (
                        <Landmark size={20} />
                      )}
                    </span>
                    <CardTitle>
                      <CardLink href={href}>{t(`capabilities.items.${key}.title`)}</CardLink>
                    </CardTitle>
                    <CardDescription>{t(`capabilities.items.${key}.text`)}</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </Reveal>
        </Container>
      </Section>

      <Section aria-labelledby="it-needs-title">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <SectionHeading
                id="it-needs-title"
                eyebrow={t("needs.eyebrow")}
                title={t("needs.title")}
                description={t("needs.description")}
              />
            </div>
            <div className="lg:col-span-7">
              <CheckList items={NEEDS.map((key) => t(`needs.items.${key}`))} />
            </div>
          </div>
        </Container>
      </Section>
    </ServicePageFrame>
  );
}
