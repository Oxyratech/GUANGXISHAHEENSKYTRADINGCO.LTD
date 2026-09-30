import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { assertLocale } from "@/i18n/assert-locale";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cookies">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal" });
  return buildMetadata({
    locale,
    path: "/cookies",
    title: t("cookies.meta.title"),
    description: t("cookies.meta.description"),
  });
}

export default async function CookiesRoute({ params }: PageProps<"/[locale]/cookies">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  return <LegalPage locale={locale} doc="cookies" />;
}
