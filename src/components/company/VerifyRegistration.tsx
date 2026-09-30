import { getTranslations } from "next-intl/server";
import { ExternalLink } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button-link";
import { SmartLink } from "@/components/ui/smart-link";
import { COMPANY } from "@/config/company";
import type { Locale } from "@/i18n/locales";
import { Notice } from "./Notice";
import { richTags } from "./rich-tags";

const STEPS = ["open", "search", "compare"] as const;

const TEXT_LINK = "font-medium text-blue-700 underline underline-offset-4 hover:text-blue-800";

/**
 * How to check the registration in the National Enterprise Credit Information Publicity System,
 * plus the reminder that the image on the page is a copy. The system link opens in a new tab and
 * says so; it is the one external destination of the page.
 */
export async function VerifyRegistration({ locale }: { locale: Locale }) {
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "companyInfo" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const newTabHint = <span className="sr-only"> ({common("a11y.opensInNewTab")})</span>;

  return (
    <div className="grid gap-6">
      <div className="grid gap-5 rounded-lg border border-line bg-white p-6 shadow-card">
        <div className="grid gap-2">
          <h3 className="text-h3 text-navy-900">{t("license.verify.title")}</h3>
          <p className="text-body text-ink-muted">{t("license.verify.intro")}</p>
        </div>
        <ol className="grid gap-4">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-start gap-4">
              <span
                aria-hidden
                className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-navy-900 text-caption font-semibold text-white"
              >
                <bdi>{index + 1}</bdi>
              </span>
              <p className="min-w-0 text-body text-ink">
                {t.rich(`license.verify.steps.${step}`, {
                  systemZh: COMPANY.verificationSystem.name,
                  zh: richTags.zh,
                  link: (chunks) => (
                    <SmartLink
                      href={COMPANY.verificationSystem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={TEXT_LINK}
                    >
                      {chunks}
                      {newTabHint}
                    </SmartLink>
                  ),
                  contact: (chunks) => (
                    <SmartLink href="/contact" className={TEXT_LINK}>
                      {chunks}
                    </SmartLink>
                  ),
                })}
              </p>
            </li>
          ))}
        </ol>
        <ButtonLink
          href={COMPANY.verificationSystem.url}
          target="_blank"
          rel="noopener noreferrer"
          className="justify-self-start"
        >
          {t("license.verify.action")}
          <ExternalLink aria-hidden />
          {newTabHint}
        </ButtonLink>
      </div>
      <Notice>{t("license.copyNote")}</Notice>
    </div>
  );
}
