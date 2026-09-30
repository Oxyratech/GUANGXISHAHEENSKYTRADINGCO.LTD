import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/locales";
import { DirectionalIcon } from "@/components/icons";
import { ServicePageFrame } from "../ServicePageFrame";

const SLUG = "business-procurement";

const AUDIENCE = ["importers", "projects", "teams"] as const;
const STEPS = ["intake", "options", "comparison", "order", "followUp"] as const;
const PATTERNS = ["oneTime", "recurring"] as const;
const NEEDS = ["company", "items", "quantities", "delivery", "compliance"] as const;

/** Procurement: who it is for, a five-stage workflow on a navy band, then what a request should hold. */
export async function BusinessProcurementPage({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: `business.pages.${SLUG}` });

  return (
    <ServicePageFrame locale={locale} slug={SLUG} tone="light" size="expanded">
      <Section aria-labelledby="bp-audience-title">
        <Container>
          <SectionHeading
            id="bp-audience-title"
            eyebrow={t("audience.eyebrow")}
            title={t("audience.title")}
            description={t("audience.description")}
          />
          <ul className="mt-12 grid gap-8 md:grid-cols-3">
            {AUDIENCE.map((who) => (
              <li key={who} className="border-s-2 border-gold-400 ps-5">
                <h3 className="text-h3 text-navy-900">{t(`audience.items.${who}.title`)}</h3>
                <p className="mt-2 text-body text-ink-muted">{t(`audience.items.${who}.text`)}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section tone="navy" aria-labelledby="bp-workflow-title">
        <Container>
          <SectionHeading
            id="bp-workflow-title"
            eyebrow={t("workflow.eyebrow")}
            title={t("workflow.title")}
            description={t("workflow.description")}
          />
          <ol className="mt-14 grid gap-10 lg:grid-cols-5 lg:gap-6">
            {STEPS.map((step, index) => (
              <li key={step} className="grid content-start gap-3">
                <div className="flex items-center gap-4">
                  <p className="shrink-0 text-eyebrow text-gold-300">
                    {t("workflow.stepLabel", { number: index + 1 })}
                  </p>
                  <span aria-hidden className="h-px flex-1 bg-white/20" />
                </div>
                <h3 className="text-h3 text-white">{t(`workflow.steps.${step}.title`)}</h3>
                <p className="text-small text-blue-100">{t(`workflow.steps.${step}.text`)}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12">
            <ButtonLink href="/global-trade/how-it-works" variant="outline-inverse">
              {t("workflow.link")}
              <DirectionalIcon />
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="bp-needs-title">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="grid content-start gap-6 lg:col-span-5">
              <h2 className="text-h2 text-navy-900">{t("patterns.title")}</h2>
              <ul className="grid gap-4">
                {PATTERNS.map((pattern) => (
                  <li key={pattern}>
                    <Card>
                      <CardHeader className="gap-2">
                        <CardTitle as="h3">{t(`patterns.items.${pattern}.title`)}</CardTitle>
                        <CardDescription className="text-body">
                          {t(`patterns.items.${pattern}.text`)}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-7">
              <SectionHeading
                id="bp-needs-title"
                eyebrow={t("needs.eyebrow")}
                title={t("needs.title")}
                description={t("needs.description")}
              />
              <dl className="mt-8 grid divide-y divide-line border-y border-line">
                {NEEDS.map((need) => (
                  <div
                    key={need}
                    className="grid gap-1 py-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-6"
                  >
                    <dt className="text-body font-semibold text-navy-900">
                      {t(`needs.items.${need}.term`)}
                    </dt>
                    <dd className="text-body text-ink-muted">{t(`needs.items.${need}.hint`)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Container>
      </Section>
    </ServicePageFrame>
  );
}
