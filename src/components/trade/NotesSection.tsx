import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { SmartLink } from "@/components/ui/smart-link";
import type { Locale } from "@/i18n/locales";

const NOTES = ["typical", "confirmed", "commercial", "regulated"] as const;

/** The caveats of the trade process: typical, confirmed per inquiry, nothing published, regulated goods. */
export async function NotesSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "globalTrade" });

  return (
    <Section tone="muted" aria-labelledby="notes-title">
      <Container>
        <SectionHeading
          id="notes-title"
          eyebrow={t("howItWorks.notes.eyebrow")}
          title={t("howItWorks.notes.title")}
        />
        <ul role="list" className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {NOTES.map((note) => (
            <li key={note} className="border-s-2 border-gold-400 ps-5">
              <h3 className="text-body-lg font-semibold text-navy-900">
                {t(`howItWorks.notes.${note}.title`)}
              </h3>
              <p className="mt-2 text-body text-ink-muted">
                {t.rich(`howItWorks.notes.${note}.description`, {
                  faq: (chunks) => (
                    <SmartLink
                      href="/faq"
                      className="text-blue-600 underline decoration-blue-300 underline-offset-4 hover:decoration-blue-600"
                    >
                      {chunks}
                    </SmartLink>
                  ),
                })}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
