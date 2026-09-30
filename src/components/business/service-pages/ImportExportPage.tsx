import { getTranslations } from "next-intl/server";
import { FileText } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/locales";
import { Callout } from "../Callout";
import { HeroIllustration, MarkerList } from "../blocks";
import { ServicePageFrame } from "../ServicePageFrame";

const SLUG = "import-export";

const STEPS = ["confirm", "requirements", "documents", "coordinate", "followUp"] as const;
const DOCUMENTS = [
  "contract",
  "invoice",
  "packingList",
  "transport",
  "origin",
  "certificates",
  "customs",
] as const;
const ROWS = ["product", "classification", "route", "terms", "documents"] as const;

/** Documentation and coordination: a vertical flow of steps next to the papers a shipment involves. */
export async function ImportExportPage({ locale }: { locale: Locale }) {
  const [t, shared] = await Promise.all([
    getTranslations({ locale, namespace: `business.pages.${SLUG}` }),
    getTranslations({ locale, namespace: "business.shared" }),
  ]);

  return (
    <ServicePageFrame
      locale={locale}
      slug={SLUG}
      tone="light"
      size="compact"
      aside={<HeroIllustration variant="documents" tone="light" alt={shared("illustration")} />}
    >
      <Section aria-labelledby="ie-scope-title">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <SectionHeading id="ie-scope-title" title={t("scope.title")} />
            </div>
            <p className="text-body-lg text-ink-muted lg:col-span-7">{t("scope.text")}</p>
          </div>
        </Container>
      </Section>

      <Section tone="muted" aria-labelledby="ie-flow-title">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <SectionHeading
                id="ie-flow-title"
                eyebrow={t("flow.eyebrow")}
                title={t("flow.title")}
                description={t("flow.description")}
              />
              <ol className="mt-10 grid">
                {STEPS.map((step, index) => (
                  <li key={step} className="relative flex gap-5 pb-9 last:pb-0">
                    {index < STEPS.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute start-5 top-11 bottom-1 w-px bg-line-strong"
                      />
                    ) : null}
                    <span
                      aria-hidden
                      className="relative grid size-10 shrink-0 place-items-center rounded-md bg-navy-900 text-label text-white"
                    >
                      <bdi>{index + 1}</bdi>
                    </span>
                    <div className="grid content-start gap-1.5 pt-1.5">
                      <h3 className="text-body-lg font-semibold text-navy-900">
                        {t(`flow.steps.${step}.title`)}
                      </h3>
                      <p className="text-body text-ink-muted">{t(`flow.steps.${step}.text`)}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Callout tone="warning" title={t("regulated.title")} titleAs="h3" className="mt-12">
                {t("regulated.text")}
              </Callout>
            </div>

            <div className="lg:col-span-5">
              <Card className="lg:sticky lg:top-24">
                <CardHeader>
                  <span
                    aria-hidden
                    className="grid size-11 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700"
                  >
                    <FileText size={20} />
                  </span>
                  <CardTitle>{t("documents.title")}</CardTitle>
                  <CardDescription>{t("documents.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <MarkerList items={DOCUMENTS.map((key) => t(`documents.items.${key}`))} />
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </Section>

      <Section aria-labelledby="ie-needs-title">
        <Container>
          <SectionHeading
            id="ie-needs-title"
            eyebrow={t("needs.eyebrow")}
            title={t("needs.title")}
            description={t("needs.description")}
          />
          <div className="mt-10 overflow-hidden rounded-lg border border-line">
            <table className="w-full border-collapse text-start">
              <thead className="bg-surface">
                <tr>
                  <th
                    scope="col"
                    className="w-1/2 border-b border-line-strong px-4 py-3 text-start text-label text-navy-900 md:px-5"
                  >
                    {t("needs.columns.information")}
                  </th>
                  <th
                    scope="col"
                    className="border-b border-line-strong px-4 py-3 text-start text-label text-navy-900 md:px-5"
                  >
                    {t("needs.columns.why")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row} className="border-b border-line last:border-b-0">
                    <th
                      scope="row"
                      className="px-4 py-4 text-start align-top text-body font-semibold text-navy-900 md:px-5"
                    >
                      {t(`needs.rows.${row}.label`)}
                    </th>
                    <td className="px-4 py-4 align-top text-body text-ink-muted md:px-5">
                      {t(`needs.rows.${row}.why`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </Section>
    </ServicePageFrame>
  );
}
