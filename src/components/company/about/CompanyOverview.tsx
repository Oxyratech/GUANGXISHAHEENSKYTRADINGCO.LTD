import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { COMPANY } from "@/config/company";
import type { Locale } from "@/i18n/locales";
import { COMPANY_NAME_VALUES } from "../company-names";
import { formatLongDate } from "../format";
import { richTags } from "../rich-tags";

/** Company Overview: who the company is, said once and only from what is on record. */
export async function CompanyOverview({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <Section aria-labelledby="overview-heading">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <SectionHeading
            id="overview-heading"
            eyebrow={t("overview.eyebrow")}
            title={t("overview.title")}
            className="self-start lg:col-span-5"
          />
          <div className="grid content-start gap-6 lg:col-span-7">
            <p className="text-body-lg text-ink">
              {t.rich("overview.intro", {
                ...COMPANY_NAME_VALUES,
                date: formatLongDate(COMPANY.establishedOn, locale),
                location: t("location"),
                ...richTags,
              })}
            </p>
            <p className="text-body text-ink-muted">{t("overview.focus")}</p>
            <p className="border-s-2 border-gold-400 ps-5 text-body text-ink-muted">
              {t("overview.newCompany")}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
