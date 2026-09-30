import { getTranslations } from "next-intl/server";
import { DirectionalIcon, Icon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { RevealStagger } from "@/components/motion/reveal-stagger";
import { ButtonLink } from "@/components/ui/button-link";
import { SmartLink } from "@/components/ui/smart-link";
import { SERVICES } from "@/content/services";
import type { Locale } from "@/i18n/locales";

/** Business Focus: the six lines of work, each linking to its own page. */
export async function BusinessFocus({ locale }: { locale: Locale }) {
  const [t, services, common] = await Promise.all([
    getTranslations({ locale, namespace: "about" }),
    getTranslations({ locale, namespace: "services" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  return (
    <Section tone="muted" aria-labelledby="focus-heading">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
          <SectionHeading
            id="focus-heading"
            eyebrow={t("focus.eyebrow")}
            title={t("focus.title")}
            description={t("focus.description")}
          />
          <ButtonLink
            href="/business"
            variant="outline"
            className="shrink-0 self-start md:self-auto"
          >
            {common("cta.exploreBusiness")}
            <DirectionalIcon />
          </ButtonLink>
        </div>
        <RevealStagger
          as="ul"
          className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2 lg:grid-cols-3"
        >
          {SERVICES.map(({ slug, icon }) => (
            <li
              key={slug}
              className="relative bg-white p-6 transition-colors hover:bg-blue-50 has-[a:focus-visible]:bg-blue-50"
            >
              <span
                aria-hidden
                className="grid size-10 place-items-center rounded-md bg-blue-50 text-blue-700"
              >
                <Icon name={icon} />
              </span>
              <h3 className="mt-4 text-body-lg font-semibold text-navy-900">
                <SmartLink
                  href={`/business/${slug}`}
                  className="after:absolute after:inset-0 after:content-['']"
                >
                  {services(`${slug}.name`)}
                </SmartLink>
              </h3>
              <p className="mt-2 text-small text-ink-muted">{services(`${slug}.summary`)}</p>
            </li>
          ))}
        </RevealStagger>
      </Container>
    </Section>
  );
}
