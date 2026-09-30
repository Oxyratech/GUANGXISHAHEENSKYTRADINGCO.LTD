/*
 * The homepage hero: static and LCP-safe (no Reveal, no client JS beyond the buttons' own links).
 * HeroArt sits behind the copy on the navy band; it is purely decorative (aria-hidden) and never the
 * LCP element, which is the heading text itself.
 */
import { getTranslations } from "next-intl/server";
import { COMPANY_NAME_VALUES } from "@/components/company/company-names";
import { HeroArt } from "@/components/graphics/HeroArt";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Eyebrow } from "@/components/layout/eyebrow";
import { ButtonLink } from "@/components/ui/button-link";
import type { Locale } from "@/i18n/locales";

export async function HomeHero({ locale }: { locale: Locale }) {
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  return (
    <header className="group/tone relative isolate overflow-hidden border-b border-navy-700 bg-navy-900 text-white">
      <div className="absolute inset-0 -z-10">
        <HeroArt />
      </div>
      <Container>
        <div className="grid gap-6 py-16 md:py-24 lg:max-w-3xl">
          <Eyebrow>{t("hero.eyebrow")}</Eyebrow>
          <h1 className="text-display text-white">{common("tagline")}</h1>
          <p className="max-w-2xl text-body-lg text-blue-100">
            {t.rich("hero.description", {
              ...COMPANY_NAME_VALUES,
              n: (chunks) => (
                <bdi lang="en" dir="ltr">
                  {chunks}
                </bdi>
              ),
              zh: (chunks) => <span lang="zh-CN">{chunks}</span>,
            })}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <ButtonLink href="/inquiry" variant="inverse" size="lg">
              {common("cta.sendInquiry")}
              <DirectionalIcon />
            </ButtonLink>
            <ButtonLink href="/business" variant="outline-inverse" size="lg">
              {common("cta.exploreBusiness")}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </header>
  );
}
