import { getFormatter, getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY } from "@/config/company";
import type { Locale } from "@/i18n/locales";

/**
 * A short summary of the registered facts, transcribed in company.ts from the business license.
 * The full record, with the license itself, is on the company information page. Registered names
 * are shown verbatim and marked with their own language, so right-to-left pages do not reorder them.
 */
export async function ContactCompanyCard({ locale }: { locale: Locale }) {
  const [t, format] = await Promise.all([
    getTranslations({ locale, namespace: "contact" }),
    getFormatter({ locale }),
  ]);

  const rows = [
    {
      key: "legalName",
      value: (
        <bdi lang="en" dir="ltr">
          {COMPANY.legalNameEn}
        </bdi>
      ),
    },
    {
      key: "legalNameZh",
      value: <span lang="zh-CN">{COMPANY.legalNameZh}</span>,
    },
    {
      key: "legalRepresentative",
      value: (
        <bdi lang="en" dir="ltr">
          {COMPANY.legalRepresentative}
        </bdi>
      ),
    },
    {
      key: "capital",
      value: t("company.capitalValue", { amount: COMPANY.registeredCapital.amount }),
    },
    {
      key: "established",
      value: format.dateTime(new Date(`${COMPANY.establishedOn}T00:00:00Z`), {
        dateStyle: "long",
        timeZone: "UTC",
      }),
    },
    {
      key: "uscc",
      value: (
        <bdi dir="ltr" className="font-mono">
          {COMPANY.unifiedSocialCreditCode}
        </bdi>
      ),
    },
  ] as const;

  return (
    <Card as="section" aria-labelledby="contact-company-title">
      <CardHeader>
        <CardTitle as="h2" id="contact-company-title">
          {t("company.title")}
        </CardTitle>
        <p className="text-small text-ink-muted">{t("company.lead")}</p>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
          {rows.map(({ key, value }) => (
            <div key={key} className="grid gap-1 sm:col-span-2 sm:grid-cols-subgrid">
              <dt className="text-small text-ink-muted">{t(`company.rows.${key}`)}</dt>
              <dd className="text-body break-words text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <ButtonLink href="/company-information" variant="outline" className="mt-6">
          {t("company.link")}
          <DirectionalIcon />
        </ButtonLink>
      </CardContent>
    </Card>
  );
}
