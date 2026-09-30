import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import { SmartLink } from "@/components/ui/smart-link";
import { BUSINESS_SCOPE_ITEMS } from "@/config/business-scope";
import type { Locale } from "@/i18n/locales";
import { BusinessScopeSummary } from "../BusinessScopeSummary";

/** Business Scope: the registered scope in groups, with the way to the complete list. */
export async function AboutScope({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "about" });

  return (
    <Section tone="muted" aria-labelledby="about-scope-heading">
      <Container>
        <SectionHeading
          id="about-scope-heading"
          eyebrow={t("scope.eyebrow")}
          title={t("scope.title")}
          description={t("scope.description", { count: BUSINESS_SCOPE_ITEMS.length })}
        />
        <div className="mt-10">
          <BusinessScopeSummary locale={locale} />
        </div>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <p className="max-w-2xl text-small text-ink-muted">
            {t.rich("scope.note", {
              products: (chunks) => (
                <SmartLink
                  href="/products"
                  className="text-blue-700 underline underline-offset-4 hover:text-blue-800"
                >
                  {chunks}
                </SmartLink>
              ),
            })}
          </p>
          <ButtonLink
            href="/company-information#business-scope"
            variant="outline"
            className="shrink-0 self-start sm:self-auto"
          >
            {t("scope.link")}
            <DirectionalIcon />
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
