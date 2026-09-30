import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { COMPANY } from "@/config/company";
import type { Locale } from "@/i18n/locales";
import { CopyButton } from "./CopyButton";
import { formatLongDate, formatRegisteredCapital } from "./format";
import { getUnofficialTranslations } from "./unofficial-translations";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 px-5 py-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6 sm:px-6">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-body text-ink">{children}</dd>
    </div>
  );
}

/** A long date in the reader's language with the machine-readable ISO date beside it. */
function DateValue({ iso, locale }: { iso: string; locale: Locale }) {
  return (
    <>
      <time dateTime={iso}>{formatLongDate(iso, locale)}</time>{" "}
      <span className="text-caption text-ink-subtle">
        (<bdi dir="ltr">{iso}</bdi>)
      </span>
    </>
  );
}

/**
 * The registration facts as an accessible definition list, straight from COMPANY. Chinese entries
 * are shown as printed on the license (lang zh-CN); readers of English and Arabic also get an
 * unofficial rendering, labelled as such. Latin names and codes are isolated so Arabic text does
 * not reorder them.
 */
export async function RegistrationFacts({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "companyInfo" });
  const translations = getUnofficialTranslations(locale);

  const unofficial = (text: string) => (
    <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-small text-ink-muted">
      <Badge>{t("facts.unofficialTranslation")}</Badge>
      <span>{text}</span>
    </p>
  );

  return (
    <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <Fact label={t("facts.nameEn")}>
        <bdi lang="en" dir="ltr" className="font-medium text-navy-900">
          {COMPANY.legalNameEn}
        </bdi>
      </Fact>
      <Fact label={t("facts.nameZh")}>
        <span lang="zh-CN" className="font-medium text-navy-900">
          {COMPANY.legalNameZh}
        </span>
      </Fact>
      <Fact label={t("facts.type")}>
        <span lang="zh-CN">{COMPANY.companyTypeZh}</span>
        {translations ? unofficial(translations.companyType) : null}
      </Fact>
      <Fact label={t("facts.representative")}>
        <bdi lang="en" dir="ltr">
          {COMPANY.legalRepresentative}
        </bdi>
      </Fact>
      <Fact label={t("facts.capital")}>
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <bdi dir="ltr" className="font-medium whitespace-nowrap text-navy-900">
            {formatRegisteredCapital()}
          </bdi>
          <span lang="zh-CN" className="text-small text-ink-muted">
            {COMPANY.registeredCapital.zh}
          </span>
        </span>
      </Fact>
      <Fact label={t("facts.established")}>
        <DateValue iso={COMPANY.establishedOn} locale={locale} />
      </Fact>
      <Fact label={t("facts.address")}>
        <span lang="zh-CN">{COMPANY.registeredAddressZh}</span>
        {translations ? unofficial(translations.address) : null}
      </Fact>
      <Fact label={t("facts.uscc")}>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <bdi dir="ltr" className="font-mono font-medium tracking-wide text-navy-900">
            {COMPANY.unifiedSocialCreditCode}
          </bdi>
          <CopyButton
            value={COMPANY.unifiedSocialCreditCode}
            label={t("facts.copy.label")}
            copiedLabel={t("facts.copy.copied")}
            announcement={t("facts.copy.announce")}
            failedLabel={t("facts.copy.failed")}
          />
        </span>
      </Fact>
      <Fact label={t("facts.authority")}>
        <span lang="zh-CN">{COMPANY.registrationAuthorityZh}</span>
        {translations ? unofficial(translations.authority) : null}
      </Fact>
      <Fact label={t("facts.issued")}>
        <DateValue iso={COMPANY.licenseIssuedOn} locale={locale} />
      </Fact>
    </dl>
  );
}
