/*
 * "Tell us what you need": explains how to send a sourcing brief and what to include. The checklist
 * is a <ul>, not a form — nothing here looks fillable, so it can never be mistaken for a working form
 * that submits nothing. The one real action is the button to the actual inquiry form.
 */
import { getTranslations } from "next-intl/server";
import { ImageSlot } from "@/components/graphics/ImageSlot";
import { Check } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import type { Locale } from "@/i18n/locales";

const CHECKLIST_ITEMS = ["product", "quantity", "specification", "destination"] as const;

export async function SourcingBriefSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <Section aria-labelledby="home-sourcing-title">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <SectionHeading
              id="home-sourcing-title"
              eyebrow={t("sourcing.eyebrow")}
              title={t("sourcing.title")}
              description={t("sourcing.description")}
            />
            <div className="mt-8 rounded-lg border border-line bg-surface p-6">
              <p className="text-label text-navy-900">{t("sourcing.checklist.title")}</p>
              <ul className="mt-4 grid gap-3">
                {CHECKLIST_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-body text-ink-muted">
                    <Check aria-hidden className="mt-1 size-4 shrink-0 text-blue-600" />
                    <span>{t(`sourcing.checklist.items.${item}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-8">
              <ButtonLink href="/inquiry" size="lg">
                {t("sourcing.cta")}
              </ButtonLink>
            </div>
          </div>
          <div className="lg:col-span-5">
            <ImageSlot
              alt={t("sourcing.illustration")}
              variant="sourcing"
              tone="light"
              width={480}
              height={360}
              className="w-full"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
