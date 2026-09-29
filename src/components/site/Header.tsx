import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand";
import { Container } from "@/components/layout/container";
import { ButtonLink } from "@/components/ui/button-link";
import { SITE } from "@/config/site";
import type { Locale } from "@/i18n/locales";
import { buildSiteNavModel } from "./build-nav-model";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";
import { SiteNav } from "./SiteNav";

/**
 * Sticky site header. From xl it shows the full navigation, the language menu and the inquiry
 * button; below that the navigation moves into MobileNav's drawer and the bar keeps only the
 * logo, a compact language menu and the menu button (seven items plus language and a call to
 * action do not fit at 1024px in any of the three languages). The registered name is left to the
 * footer so the wordmark stays compact.
 */
export async function Header({ locale }: { locale: Locale }) {
  const [model, t] = await Promise.all([
    buildSiteNavModel(locale),
    getTranslations({ locale, namespace: "common" }),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <Container size="wide" className="flex h-16 items-center gap-3 xl:h-[4.5rem] xl:gap-6">
        <Logo asLink size="sm" legalName="never" label={t("a11y.homeLink", { name: SITE.name })} />
        <SiteNav items={model.items} />
        <div className="ms-auto flex items-center gap-1 xl:gap-3">
          <LanguageSwitcher variant="menu" />
          <ButtonLink href={model.inquiry.href} className="hidden xl:inline-flex">
            {model.inquiry.label}
          </ButtonLink>
          <MobileNav items={model.items} inquiry={model.inquiry} />
        </div>
      </Container>
    </header>
  );
}
