import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FaqPage } from "@/components/faq/FaqPage";
import { assertLocale } from "@/i18n/assert-locale";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "faq" });
  return buildMetadata({
    locale,
    path: "/faq",
    title: t("meta.title"),
    description: t("meta.description"),
  });
}

export default async function FaqRoute({ params }: PageProps<"/[locale]/faq">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  return <FaqPage locale={locale} />;
}
