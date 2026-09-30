import { getTranslations } from "next-intl/server";
import { ChevronDown, DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import { BUSINESS_SCOPE_ITEMS, getFullScopeTextZh, SCOPE_SUFFIX_ZH } from "@/config/business-scope";
import type { Locale } from "@/i18n/locales";
import { Notice } from "./Notice";
import { loadScopeGroups } from "./scope-model";

/**
 * The complete registered business scope, for the company information page. All 40 registered
 * items, grouped by area of trade. Chinese readers get the license wording; English and Arabic
 * readers get the translation from the shared `scope` namespace with the official Chinese under
 * each item. The qualifier, the translation note and the licensing note are always shown, and a
 * callout says the scope is not a list of published products.
 */
export async function BusinessScopeDetail({ locale }: { locale: Locale }) {
  const [groups, t, info, common] = await Promise.all([
    loadScopeGroups(locale),
    getTranslations({ locale, namespace: "scope" }),
    getTranslations({ locale, namespace: "companyInfo" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  const showOfficial = locale !== "zh";

  return (
    <Section id="business-scope" aria-labelledby="business-scope-heading">
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
          <SectionHeading
            id="business-scope-heading"
            eyebrow={info("scope.eyebrow")}
            title={t("title")}
            description={t("intro")}
            className="lg:col-span-6"
          />
          <Notice title={info("scope.qualifierTitle")} className="lg:col-span-6">
            {showOfficial ? (
              <>
                <p>{t("qualifier")}</p>
                <p lang="zh-CN">{SCOPE_SUFFIX_ZH}</p>
              </>
            ) : (
              <p lang="zh-CN">{SCOPE_SUFFIX_ZH}</p>
            )}
          </Notice>
        </div>

        <div className="mt-12 flex flex-col gap-1 border-b border-navy-900 pb-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <p className="text-eyebrow text-navy-900">{t("generalItemsLabel")}</p>
          <p className="text-small text-ink-muted">
            {info("scope.stats", { count: BUSINESS_SCOPE_ITEMS.length, groups: groups.length })}
          </p>
        </div>
        <p className="mt-3 text-small text-ink-muted">{info("scope.officialLegend")}</p>

        <div className="divide-y divide-line">
          {groups.map(({ group, name, description, items }) => (
            <div
              key={group}
              className="grid gap-4 py-7 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-12"
            >
              <div className="grid content-start gap-1.5">
                <h3
                  id={`scope-group-${group}`}
                  className="text-body-lg font-semibold text-navy-900"
                >
                  {name}
                </h3>
                <p className="text-small text-ink-muted">{description}</p>
              </div>
              <ul
                aria-labelledby={`scope-group-${group}`}
                className="grid content-start gap-x-8 gap-y-3 sm:grid-cols-2"
              >
                {items.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <span className="text-body text-ink">{item.text}</span>
                    {showOfficial ? (
                      <span lang="zh-CN" className="block text-small text-ink-subtle">
                        {item.zh}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid gap-4 border-t border-line pt-8 lg:grid-cols-2">
          <Notice title={info("scope.translationTitle")}>{t("translationNote")}</Notice>
          <Notice tone="caution" title={info("scope.regulatedTitle")}>
            {t("regulatedNote")}
          </Notice>
        </div>

        <details className="group mt-6 rounded-lg border border-line bg-white">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-label text-navy-900 [&::-webkit-details-marker]:hidden">
            {info("scope.fullText.summary")}
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="grid gap-3 border-t border-line px-5 py-4">
            <p className="text-small text-ink-muted">{info("scope.fullText.note")}</p>
            <p lang="zh-CN" className="text-body text-ink">
              {getFullScopeTextZh()}
            </p>
          </div>
        </details>

        <Notice
          tone="highlight"
          size="lg"
          titleAs="h3"
          title={info("scope.notPublished.title")}
          className="mt-10"
        >
          <p>{info("scope.notPublished.body")}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <ButtonLink href="/products">
              {common("cta.browseProducts")}
              <DirectionalIcon />
            </ButtonLink>
            <ButtonLink href="/inquiry" variant="outline">
              {common("cta.sendInquiry")}
            </ButtonLink>
          </div>
        </Notice>
      </Container>
    </Section>
  );
}
