import { getTranslations } from "next-intl/server";
import { WorldMap } from "@/components/graphics/WorldMap";
import { FileText, Icon, ShieldCheck } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/locales";
import { CheckList, Disclosure, MarkerList } from "../blocks";
import { Callout } from "../Callout";
import { ServicePageFrame } from "../ServicePageFrame";

const SLUG = "cross-border-trade";

const QUESTIONS = ["transport", "destination", "regulated", "website"] as const;
const NEEDS = ["countries", "goods", "terms", "documents", "regulation"] as const;

/** Cross-border: three columns of considerations, then questions to settle early beside a checklist. */
export async function CrossBorderTradePage({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: `business.pages.${SLUG}` });

  // Spelled out so every message key is checked against its group.
  const considerations = [
    {
      key: "lanes",
      icon: <Icon name="Ship" size={20} />,
      title: t("considerations.groups.lanes.title"),
      items: [
        t("considerations.groups.lanes.items.route"),
        t("considerations.groups.lanes.items.terms"),
        t("considerations.groups.lanes.items.handling"),
        t("considerations.groups.lanes.items.transit"),
      ],
    },
    {
      key: "documents",
      icon: <FileText size={20} />,
      title: t("considerations.groups.documents.title"),
      items: [
        t("considerations.groups.documents.items.commercial"),
        t("considerations.groups.documents.items.transport"),
        t("considerations.groups.documents.items.certificates"),
        t("considerations.groups.documents.items.consistency"),
      ],
    },
    {
      key: "compliance",
      icon: <ShieldCheck size={20} />,
      title: t("considerations.groups.compliance.title"),
      items: [
        t("considerations.groups.compliance.items.import"),
        t("considerations.groups.compliance.items.standards"),
        t("considerations.groups.compliance.items.duties"),
        t("considerations.groups.compliance.items.controls"),
      ],
    },
  ];

  return (
    <ServicePageFrame
      locale={locale}
      slug={SLUG}
      tone="navy"
      size="expanded"
      aside={
        <div
          aria-hidden="true"
          className="hidden rounded-lg border border-white/10 bg-navy-800/60 p-4 lg:block"
        >
          <WorldMap tone="navy" highlightNanning />
        </div>
      }
    >
      <Section aria-labelledby="cb-context-title">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="grid content-start gap-5 lg:col-span-7">
              <SectionHeading id="cb-context-title" title={t("context.title")} />
              <p className="max-w-3xl text-body-lg text-ink-muted">{t("context.text")}</p>
            </div>
            <div className="lg:col-span-5">
              <Callout>{t("context.notShop")}</Callout>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="muted" aria-labelledby="cb-considerations-title">
        <Container>
          <SectionHeading
            id="cb-considerations-title"
            eyebrow={t("considerations.eyebrow")}
            title={t("considerations.title")}
            description={t("considerations.description")}
          />
          <ul className="mt-12 grid gap-6 lg:grid-cols-3">
            {considerations.map((group) => (
              <li key={group.key} className="flex">
                <Card className="w-full">
                  <CardHeader className="gap-4">
                    <span
                      aria-hidden
                      className="grid size-11 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700"
                    >
                      {group.icon}
                    </span>
                    <CardTitle as="h3">{group.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MarkerList items={group.items} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section aria-labelledby="cb-questions-title">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-8">
              <SectionHeading
                id="cb-questions-title"
                eyebrow={t("questions.eyebrow")}
                title={t("questions.title")}
                description={t("questions.description")}
              />
              <div className="mt-10">
                {QUESTIONS.map((question) => (
                  <Disclosure
                    key={question}
                    name="cb-questions"
                    summary={t(`questions.items.${question}.question`)}
                  >
                    {t(`questions.items.${question}.answer`)}
                  </Disclosure>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4">
              <Card className="lg:sticky lg:top-24">
                <CardHeader>
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
