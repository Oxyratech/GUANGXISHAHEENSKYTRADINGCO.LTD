/*
 * Three registration facts, exactly as recorded on the business license — not performance statistics.
 * No counters: every value is static, so an animated count-up would only add motion for no reason.
 */
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { formatLongDate } from "@/components/company/format";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { SmartLink } from "@/components/ui/smart-link";
import { COMPANY } from "@/config/company";
import type { Locale } from "@/i18n/locales";

type FactKey = "established" | "location" | "focus";

export async function CredibilityStrip({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });

  const facts: { key: FactKey; value: ReactNode }[] = [
    {
      key: "established",
      value: (
        <time dateTime={COMPANY.establishedOn}>
          {formatLongDate(COMPANY.establishedOn, locale)}
        </time>
      ),
    },
    { key: "location", value: t("credibility.values.location") },
    { key: "focus", value: t("credibility.values.focus") },
  ];

  return (
    <Section tone="muted" spacing="compact" aria-labelledby="home-credibility-title">
      <Container>
        <SectionHeading
          id="home-credibility-title"
          eyebrow={t("credibility.eyebrow")}
          title={t("credibility.title")}
        />
        <dl className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(({ key, value }) => (
            <div key={key} className="rounded-lg border border-line bg-white p-5 shadow-card">
              <dt className="text-label text-ink-muted">{t(`credibility.facts.${key}`)}</dt>
              <dd className="mt-1.5 text-h3 text-navy-900">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-3xl text-small text-ink-muted">
          {t.rich("credibility.caption", {
            link: (chunks) => (
              <SmartLink
                href="/company-information"
                className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:decoration-blue-700"
              >
                {chunks}
              </SmartLink>
            ),
          })}
        </p>
      </Container>
    </Section>
  );
}
