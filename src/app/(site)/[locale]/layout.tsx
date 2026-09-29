import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Analytics } from "@/components/analytics/Analytics";
import { pickClientMessages } from "@/components/site/client-messages";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { SkipLink } from "@/components/site/SkipLink";
import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/toast";
import { getSiteUrl, isSiteUrlConfigured, SITE } from "@/config/site";
import { getDirection, LOCALE_META, LOCALES } from "@/i18n/locales";
import { plexArabic, plexSans } from "@/lib/fonts";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { getPublicContactChannels } from "@/server/settings";
import "../../globals.css";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  // Never index a deployment that has no real domain configured.
  robots: isSiteUrlConfigured() ? undefined : { index: false, follow: false },
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) notFound();
  setRequestLocale(locale);

  const [messages, t, channels] = await Promise.all([
    getMessages({ locale }),
    getTranslations({ locale, namespace: "common" }),
    getPublicContactChannels(),
  ]);

  return (
    <html
      lang={LOCALE_META[locale].htmlLang}
      dir={getDirection(locale)}
      className={`${plexSans.variable} ${plexArabic.variable}`}
    >
      <body className="flex min-h-dvh flex-col bg-background text-foreground">
        {/* Client components get only the namespaces they use, not every catalogue. */}
        <NextIntlClientProvider locale={locale} messages={pickClientMessages(messages)}>
          <DirectionProvider dir={getDirection(locale)}>
            <Toaster viewportLabel={t("a11y.notifications")} closeLabel={t("labels.close")}>
              <SkipLink label={t("a11y.skipToContent")} />
              <Header locale={locale} />
              <main id="main" tabIndex={-1} className="flex-1 focus-visible:outline-none!">
                {children}
              </main>
              <Footer locale={locale} channels={channels} />
            </Toaster>
          </DirectionProvider>
          <Analytics />
        </NextIntlClientProvider>
        {/* Contact details only when configured: none has been supplied, none is invented. */}
        <JsonLd
          data={[
            organizationJsonLd({ channels: { email: channels.email, telephone: channels.phone } }),
            websiteJsonLd(locale),
          ]}
        />
      </body>
    </html>
  );
}
