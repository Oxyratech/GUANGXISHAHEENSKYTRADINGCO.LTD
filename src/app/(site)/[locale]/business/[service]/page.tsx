import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SERVICE_PAGES } from "@/components/business/service-pages";
import { isServiceSlug, SERVICE_SLUGS } from "@/content/services";
import { assertLocale } from "@/i18n/assert-locale";
import { LOCALES } from "@/i18n/locales";
import { buildMetadata } from "@/lib/seo";

// Only the registered business lines exist: any other slug is a real 404, not a soft one.
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => SERVICE_SLUGS.map((service) => ({ locale, service })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/business/[service]">): Promise<Metadata> {
  const { locale: rawLocale, service } = await params;
  const locale = assertLocale(rawLocale);
  if (!isServiceSlug(service)) notFound();
  const t = await getTranslations({ locale, namespace: "business" });

  return buildMetadata({
    locale,
    path: `/business/${service}`,
    title: t(`pages.${service}.meta.title`),
    description: t(`pages.${service}.meta.description`),
  });
}

export default async function BusinessServicePage({
  params,
}: PageProps<"/[locale]/business/[service]">) {
  const { locale: rawLocale, service } = await params;
  const locale = assertLocale(rawLocale);
  setRequestLocale(locale);
  if (!isServiceSlug(service)) notFound();

  const Page = SERVICE_PAGES[service];
  return <Page locale={locale} />;
}
