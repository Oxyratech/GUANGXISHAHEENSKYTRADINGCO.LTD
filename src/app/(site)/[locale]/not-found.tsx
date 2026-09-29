import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Eyebrow } from "@/components/layout/eyebrow";
import { Section } from "@/components/layout/section";
import { ButtonLink } from "@/components/ui/button-link";
import { PRIMARY_NAV } from "@/config/navigation";
import { Link } from "@/i18n/navigation";

/** Where a lost visitor most likely wants to go: every primary section except the home page. */
const HELPFUL_LINKS = PRIMARY_NAV.filter((item) => item.id !== "home" && item.id !== "about");

export async function generateMetadata(): Promise<Metadata> {
  const [t, common] = await Promise.all([getTranslations("errors"), getTranslations("common")]);
  return { title: { absolute: `${t("notFound.title")} | ${common("siteName")}` } };
}

/** Rendered inside the locale layout, so the header, footer and language are those of the visitor. */
export default async function LocaleNotFound() {
  const [t, common] = await Promise.all([getTranslations("errors"), getTranslations("common")]);

  return (
    <Section>
      <Container size="narrow">
        <div className="grid gap-6">
          <Eyebrow>{t("notFound.eyebrow")}</Eyebrow>
          <h1 className="text-h1 text-navy-900">{t("notFound.title")}</h1>
          <p className="max-w-xl text-body-lg text-ink-muted">{t("notFound.description")}</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/">
              {t("notFound.homeLink")}
              <DirectionalIcon />
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline">
              {common("cta.contactUs")}
            </ButtonLink>
          </div>
          <nav aria-labelledby="not-found-links" className="mt-6 border-t border-line pt-6">
            <h2 id="not-found-links" className="text-eyebrow text-ink-subtle">
              {t("notFound.helpfulLinks")}
            </h2>
            <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
              {HELPFUL_LINKS.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.link.href}
                    className="inline-flex min-h-11 items-center text-body font-medium text-blue-700 underline-offset-4 hover:text-blue-800 hover:underline"
                  >
                    {common(`nav.${item.link.labelKey}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
    </Section>
  );
}
