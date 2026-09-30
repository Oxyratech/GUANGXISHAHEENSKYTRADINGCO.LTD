import { getTranslations } from "next-intl/server";
import { Info, Mail, MessageCircle, Phone } from "@/components/icons";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/layout/section-heading";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardDescription, CardHeader, CardLink, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/locales";
import { mailtoHref, telHref, whatsappHref, type PublicContactChannels } from "@/server/settings";

const CHANNELS = [
  { key: "email", Icon: Mail, href: mailtoHref },
  { key: "phone", Icon: Phone, href: telHref },
  { key: "whatsapp", Icon: MessageCircle, href: whatsappHref },
] as const;

/**
 * Business contact. It lists exactly the channels the company has published (site settings or
 * environment); none has been supplied so far, and nothing is invented in their place. Without any
 * channel it says so and points to the two forms, which always work.
 */
export async function ContactChannels({
  locale,
  channels,
}: {
  locale: Locale;
  channels: PublicContactChannels;
}) {
  const t = await getTranslations({ locale, namespace: "contact" });
  const published = CHANNELS.flatMap(({ key, Icon, href }) => {
    const value = channels[key];
    return value ? [{ key, Icon, value, href: href(value) }] : [];
  });

  return (
    <Section aria-labelledby="contact-channels-title">
      <Container>
        <SectionHeading
          id="contact-channels-title"
          title={t("channels.title")}
          description={published.length > 0 ? t("channels.lead") : undefined}
        />
        {published.length > 0 ? (
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {published.map(({ key, Icon, value, href }) => (
              <li key={key} className="flex">
                <Card interactive className="w-full">
                  <CardHeader>
                    <span
                      aria-hidden
                      className="grid size-11 place-items-center rounded-lg border border-line bg-surface text-navy-700"
                    >
                      <Icon className="size-5" />
                    </span>
                    <CardTitle as="h3">{t(`channels.${key}`)}</CardTitle>
                    <CardDescription className="text-body">
                      <CardLink href={href} className="break-all text-ink">
                        <bdi dir="ltr">{value}</bdi>
                      </CardLink>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="mt-10 max-w-3xl gap-5 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-surface text-navy-700"
              >
                <Info className="size-5" />
              </span>
              <div className="grid gap-2">
                <h3 className="text-h3 text-navy-900">{t("channels.none.title")}</h3>
                <p className="text-body text-ink-muted">{t("channels.none.body")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/inquiry">{t("channels.inquiryLink")}</ButtonLink>
              <ButtonLink href="#contact-form" variant="outline">
                {t("channels.formLink")}
              </ButtonLink>
            </div>
          </Card>
        )}
      </Container>
    </Section>
  );
}
