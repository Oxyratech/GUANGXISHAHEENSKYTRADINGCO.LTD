import { getTranslations } from "next-intl/server";
import { Check, DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import type { Locale } from "@/i18n/locales";

/** What a useful sourcing brief contains, in the order a buyer thinks of it. */
const BRIEF_ITEMS = [
  "product",
  "quantity",
  "destination",
  "quality",
  "terms",
  "documents",
  "contact",
] as const;

/** "Tell us what you need": what to put in a sourcing brief, and the way to the inquiry form. */
export async function BriefSection({ locale }: { locale: Locale }) {
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "globalTrade" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  return (
    <Section tone="muted" aria-labelledby="brief-title">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-16">
          <div className="grid gap-8">
            <SectionHeading
              id="brief-title"
              eyebrow={t("overview.brief.eyebrow")}
              title={t("overview.brief.title")}
              description={t("overview.brief.description")}
            />
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/inquiry" size="lg">
                {common("cta.submitTradeInquiry")}
                <DirectionalIcon />
              </ButtonLink>
              <ButtonLink href="/products" variant="outline" size="lg">
                {common("cta.browseProducts")}
              </ButtonLink>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-white p-6 shadow-card sm:p-8">
            <h3 className="text-h3 text-navy-900">{t("overview.brief.listTitle")}</h3>
            <ul role="list" className="mt-5 grid gap-3.5">
              {BRIEF_ITEMS.map((item) => (
                <li key={item} className="flex gap-3 text-body text-ink">
                  <Check aria-hidden className="mt-1.5 size-4 shrink-0 text-blue-600" />
                  {t(`overview.brief.items.${item}`)}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-line pt-5 text-small text-ink-muted">
              {t("overview.brief.note")}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
