import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Eyebrow } from "@/components/layout/eyebrow";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import { CheckList } from "../blocks";
import { ServicePageFrame } from "../ServicePageFrame";

const SLUG = "supplier-coordination";

const ROLES = ["buyer", "us", "supplier"] as const;
const AREAS = [
  "requirements",
  "quotations",
  "samples",
  "packaging",
  "documents",
  "changes",
] as const;
const RHYTHM = ["start", "quotations", "changes", "decision"] as const;
const NEEDS = ["contact", "specs", "answers", "decisions"] as const;

/** Coordination: who does what, the areas coordinated, and communication as a list of intentions. */
export async function SupplierCoordinationPage({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: `business.pages.${SLUG}` });

  return (
    <ServicePageFrame locale={locale} slug={SLUG} tone="navy" size="compact">
      <Section aria-labelledby="sc-roles-title">
        <Container>
          <SectionHeading
            id="sc-roles-title"
            eyebrow={t("roles.eyebrow")}
            title={t("roles.title")}
            description={t("roles.description")}
          />
          <ul className="mt-12 grid gap-6 lg:grid-cols-3">
            {ROLES.map((role) => {
              const isUs = role === "us";
              return (
                <li key={role} className="flex">
                  <Card
                    className={cn(
                      "w-full border-t-2 border-t-line-strong",
                      isUs && "border-navy-900 border-t-gold-400 bg-navy-900 text-white",
                    )}
                  >
                    <CardHeader className="gap-3 p-6">
                      <CardTitle as="h3" className={cn(isUs && "text-white")}>
                        {t(`roles.items.${role}.title`)}
                      </CardTitle>
                      <CardDescription
                        className={cn("text-body", isUs ? "text-blue-100" : "text-ink-muted")}
                      >
                        {t(`roles.items.${role}.text`)}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              );
            })}
          </ul>
        </Container>
      </Section>

      <Section tone="muted" aria-labelledby="sc-areas-title">
        <Container>
          <SectionHeading
            id="sc-areas-title"
            eyebrow={t("areas.eyebrow")}
            title={t("areas.title")}
            description={t("areas.description")}
          />
          <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {AREAS.map((area) => (
              <li key={area} className="border-t border-line-strong pt-5">
                <h3 className="text-body-lg font-semibold text-navy-900">
                  {t(`areas.items.${area}.title`)}
                </h3>
                <p className="mt-2 text-body text-ink-muted">{t(`areas.items.${area}.text`)}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section aria-labelledby="sc-rhythm-title">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <SectionHeading
                id="sc-rhythm-title"
                eyebrow={t("rhythm.eyebrow")}
                title={t("rhythm.title")}
                description={t("rhythm.description")}
              />
              <dl className="mt-10 grid gap-8 border-s border-line-strong ps-8">
                {RHYTHM.map((moment) => (
                  <div key={moment} className="relative">
                    <span
                      aria-hidden
                      className="absolute -start-[2.4rem] top-2 size-3 rounded-sm bg-gold-500"
                    />
                    <dt className="text-body-lg font-semibold text-navy-900">
                      {t(`rhythm.items.${moment}.when`)}
                    </dt>
                    <dd className="mt-1 text-body text-ink-muted">
                      {t(`rhythm.items.${moment}.text`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="lg:col-span-5">
              <Card className="lg:sticky lg:top-24">
                <CardHeader>
                  <Eyebrow>{t("needs.eyebrow")}</Eyebrow>
                  <CardTitle as="h2">{t("needs.title")}</CardTitle>
                  <CardDescription>{t("needs.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <CheckList items={NEEDS.map((key) => t(`needs.items.${key}`))} />
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </ServicePageFrame>
  );
}
