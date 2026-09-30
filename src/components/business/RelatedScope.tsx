import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { DirectionalIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button-link";
import { getScopeItem, type ScopeItem } from "@/config/business-scope";
import type { ServiceSlug } from "@/content/services";
import type { Locale } from "@/i18n/locales";
import { scopeItemKey } from "./scope-item-key";
import { serviceDefinition, SUPPORTING_LINES } from "./service-config";

/** The registered scope items a business line relates to, with the wording of the license. */
export async function RelatedScope({ locale, slug }: { locale: Locale; slug: ServiceSlug }) {
  const [t, scope] = await Promise.all([
    getTranslations({ locale, namespace: "business" }),
    getTranslations({ locale, namespace: "scope" }),
  ]);
  const items = serviceDefinition(slug)
    .scopeItemIds.map(getScopeItem)
    .filter((item): item is ScopeItem => item !== undefined);
  // In Chinese the translated wording is the license text itself; showing it twice would be noise.
  const showLicenseText = locale !== "zh";
  const headingId = `${slug}-scope-title`;

  return (
    <Section tone="muted" aria-labelledby={headingId}>
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="grid content-start gap-6 lg:col-span-5">
            <SectionHeading
              id={headingId}
              eyebrow={t("shared.scope.eyebrow")}
              title={t("shared.scope.title")}
              description={t("shared.scope.description")}
            />
            {SUPPORTING_LINES.has(slug) ? (
              <p className="text-small text-ink-muted">{t("shared.scope.supportNote")}</p>
            ) : null}
            <div>
              <ButtonLink href="/company-information" variant="outline">
                {t("shared.scope.viewAll")}
                <DirectionalIcon />
              </ButtonLink>
            </div>
          </div>

          <div className="grid content-start gap-4 lg:col-span-7">
            <ul className="grid gap-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-line bg-white p-5 shadow-card"
                >
                  <p className="text-body-lg font-semibold text-navy-900">
                    {scope(scopeItemKey(item.id))}
                  </p>
                  {showLicenseText ? (
                    <p className="mt-1 text-small text-ink-muted">
                      <span>{scope("officialTextLabel")}: </span>
                      <bdi lang="zh-CN" dir="ltr" className="text-ink">
                        {item.zh}
                      </bdi>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="text-caption text-ink-subtle">{scope("qualifier")}</p>
            {showLicenseText ? (
              <p className="text-caption text-ink-subtle">{scope("translationNote")}</p>
            ) : null}
          </div>
        </div>
      </Container>
    </Section>
  );
}
