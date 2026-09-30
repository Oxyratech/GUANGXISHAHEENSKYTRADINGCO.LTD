import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartLink } from "@/components/ui/smart-link";
import type { Locale } from "@/i18n/locales";
import { Callout } from "../Callout";
import { CheckList, HeroIllustration } from "../blocks";
import { ServicePageFrame } from "../ServicePageFrame";

const SLUG = "product-sourcing";

const STEPS = ["review", "search", "share"] as const;

/** Sourcing: the page is the brief checklist; the process and a pointer to the categories follow. */
export async function ProductSourcingPage({ locale }: { locale: Locale }) {
  const [t, shared] = await Promise.all([
    getTranslations({ locale, namespace: `business.pages.${SLUG}` }),
    getTranslations({ locale, namespace: "business.shared" }),
  ]);

  // The three groups of the brief. Spelled out so every message key is checked against its group.
  const groups = [
    {
      key: "product",
      title: t("brief.groups.product.title"),
      items: [
        t("brief.groups.product.items.use"),
        t("brief.groups.product.items.specs"),
        t("brief.groups.product.items.quality"),
        t("brief.groups.product.items.brand"),
      ],
    },
    {
      key: "commercial",
      title: t("brief.groups.commercial.title"),
      items: [
        t("brief.groups.commercial.items.quantity"),
        t("brief.groups.commercial.items.price"),
        t("brief.groups.commercial.items.destination"),
        t("brief.groups.commercial.items.timing"),
      ],
    },
    {
      key: "compliance",
      title: t("brief.groups.compliance.title"),
      items: [
        t("brief.groups.compliance.items.certificates"),
        t("brief.groups.compliance.items.packaging"),
        t("brief.groups.compliance.items.samples"),
        t("brief.groups.compliance.items.testing"),
      ],
    },
  ];

  return (
    <ServicePageFrame
      locale={locale}
      slug={SLUG}
      tone="light"
      size="expanded"
      aside={<HeroIllustration variant="sourcing" tone="navy" alt={shared("illustration")} />}
    >
      <Section aria-labelledby="ps-brief-title">
        <Container>
          <SectionHeading
            id="ps-brief-title"
            eyebrow={t("brief.eyebrow")}
            title={t("brief.title")}
            description={t("brief.description")}
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {groups.map((group) => (
              <Card key={group.key}>
                <CardHeader>
                  <CardTitle as="h3">{group.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CheckList items={group.items} />
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-body text-ink-muted">{t("brief.footnote")}</p>
        </Container>
      </Section>

      <Section tone="muted" aria-labelledby="ps-process-title">
        <Container>
          <SectionHeading
            id="ps-process-title"
            eyebrow={t("process.eyebrow")}
            title={t("process.title")}
            description={t("process.description")}
          />
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step} className="grid content-start gap-3 border-t-2 border-navy-900 pt-5">
                <span aria-hidden className="text-h2 text-gold-600">
                  <bdi>{`0${index + 1}`}</bdi>
                </span>
                <h3 className="text-h3 text-navy-900">{t(`process.steps.${step}.title`)}</h3>
                <p className="text-body text-ink-muted">{t(`process.steps.${step}.text`)}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section spacing="compact">
        <Container>
          <Callout title={t("tip.title")} titleAs="h2" className="max-w-4xl">
            {t.rich("tip.text", {
              products: (chunks) => (
                <SmartLink
                  href="/products"
                  className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:decoration-blue-700"
                >
                  {chunks}
                </SmartLink>
              ),
            })}
          </Callout>
        </Container>
      </Section>
    </ServicePageFrame>
  );
}
