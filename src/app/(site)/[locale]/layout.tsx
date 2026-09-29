import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getSiteUrl, isSiteUrlConfigured, SITE } from "@/config/site";
import { getDirection, LOCALE_META, LOCALES } from "@/i18n/locales";
import { plexArabic, plexSans } from "@/lib/fonts";
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

  return (
    <html
      lang={LOCALE_META[locale].htmlLang}
      dir={getDirection(locale)}
      className={`${plexSans.variable} ${plexArabic.variable}`}
    >
      <body className="bg-background text-foreground">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
