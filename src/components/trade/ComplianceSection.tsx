import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Alert } from "@/components/ui/alert";
import { SmartLink } from "@/components/ui/smart-link";
import type { Locale } from "@/i18n/locales";

const POINTS = ["regulated", "varies", "confirm"] as const;

/**
 * Compliance awareness. It says which goods can be regulated and that rules differ by country; it
 * never implies that the company holds any license, filing or approval.
 */
export async function ComplianceSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "globalTrade" });

  return (
    <Section tone="muted" aria-labelledby="compliance-title">
      <Container>
        <SectionHeading
          id="compliance-title"
          eyebrow={t("overview.compliance.eyebrow")}
          title={t("overview.compliance.title")}
          description={t("overview.compliance.description")}
        />
        <ul role="list" className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
          {POINTS.map((point) => (
            <li key={point} className="border-t-2 border-navy-900 pt-5">
              <h3 className="text-h3 text-navy-900">
                {t(`overview.compliance.points.${point}.title`)}
              </h3>
              <p className="mt-3 text-body text-ink-muted">
                {t(`overview.compliance.points.${point}.description`)}
              </p>
            </li>
          ))}
        </ul>
        <Alert className="mt-12 max-w-3xl">
          {t.rich("overview.compliance.note", {
            scope: (chunks) => (
              <SmartLink
                href="/company-information"
                className="text-blue-600 underline decoration-blue-300 underline-offset-4 hover:decoration-blue-600"
              >
                {chunks}
              </SmartLink>
            ),
          })}
        </Alert>
      </Container>
    </Section>
  );
}
