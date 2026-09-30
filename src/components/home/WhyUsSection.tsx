import { getTranslations } from "next-intl/server";
import { FileText, Globe, Icon, ShieldCheck } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { Reveal } from "@/components/motion/reveal";
import type { Locale } from "@/i18n/locales";

/**
 * Five verifiable, non-comparative reasons to work with the company. Deliberately excludes any
 * claim of experience, speed, network size, quality guarantees or staff language ability.
 */
const POINTS = [
  { key: "verifiable", icon: <ShieldCheck aria-hidden className="size-5" /> },
  { key: "scope", icon: <FileText aria-hidden className="size-5" /> },
  { key: "inquiryProcess", icon: <Icon name="ClipboardList" size={20} /> },
  { key: "languages", icon: <Globe aria-hidden className="size-5" /> },
  { key: "contact", icon: <Icon name="Handshake" size={20} /> },
] as const;

export async function WhyUsSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <Section aria-labelledby="home-why-title">
      <Container>
        <SectionHeading id="home-why-title" eyebrow={t("why.eyebrow")} title={t("why.title")} />
        <Reveal as="ul" className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {POINTS.map(({ key, icon }) => (
            <li key={key} className="grid gap-3">
              <span
                aria-hidden
                className="grid size-11 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700"
              >
                {icon}
              </span>
              <h3 className="text-h3 text-navy-900">{t(`why.points.${key}.title`)}</h3>
              <p className="text-body text-ink-muted">{t(`why.points.${key}.body`)}</p>
            </li>
          ))}
        </Reveal>
      </Container>
    </Section>
  );
}
