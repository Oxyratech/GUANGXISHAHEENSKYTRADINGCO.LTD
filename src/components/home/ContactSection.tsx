import { getTranslations } from "next-intl/server";
import { getUnofficialTranslations } from "@/components/company/unofficial-translations";
import { Mail, MessageCircle, Phone } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY } from "@/config/company";
import type { Locale } from "@/i18n/locales";
import { getPublicContactChannels, mailtoHref, telHref, whatsappHref } from "@/server/settings";

const CHANNELS = [
  { key: "email", Icon: Mail, href: mailtoHref },
  { key: "phone", Icon: Phone, href: telHref },
  { key: "whatsapp", Icon: MessageCircle, href: whatsappHref },
] as const;

/**
 * The honest contact route: the two real forms, the registered address, and any contact channel the
 * company has actually published (never invented; getPublicContactChannels never throws).
 */
export async function ContactSection({ locale }: { locale: Locale }) {
  const [t, channels] = await Promise.all([
    getTranslations({ locale, namespace: "home" }),
    getPublicContactChannels(),
  ]);
  const translations = getUnofficialTranslations(locale);
  const published = CHANNELS.flatMap(({ key, Icon, href }) => {
    const value = channels[key];
    return value ? [{ key, Icon, value, href: href(value) }] : [];
  });

  return (
    <Section aria-labelledby="home-contact-title">
      <Container>
        <SectionHeading
          id="home-contact-title"
          eyebrow={t("contact.eyebrow")}
          title={t("contact.title")}
          description={t("contact.description")}
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <Card as="section" aria-labelledby="home-contact-address-title" className="lg:col-span-5">
            <CardHeader>
              <CardTitle as="h3" id="home-contact-address-title">
                {t("contact.addressLabel")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <address className="text-body-lg text-navy-900 not-italic" lang="zh-CN">
                {COMPANY.registeredAddressZh}
              </address>
              {translations ? (
                <p className="text-small text-ink-muted">
                  <bdi lang="en" dir="ltr">
                    {translations.address}
                  </bdi>{" "}
                  <span>({t("contact.addressTranslationLabel")})</span>
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid content-start gap-6 lg:col-span-7">
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/inquiry" size="lg">
                {t("contact.inquiryCta")}
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline" size="lg">
                {t("contact.contactCta")}
              </ButtonLink>
            </div>
            {published.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-3">
                {published.map(({ key, Icon, value, href }) => (
                  <li key={key}>
                    <Card interactive>
                      <a href={href} className="flex items-center gap-3 p-4">
                        <Icon aria-hidden className="size-5 shrink-0 text-blue-700" />
                        <span className="min-w-0">
                          <span className="block text-label text-navy-900">
                            {t(`contact.channels.${key}`)}
                          </span>
                          <bdi dir="ltr" className="block truncate text-small text-ink-muted">
                            {value}
                          </bdi>
                        </span>
                      </a>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </Container>
    </Section>
  );
}
