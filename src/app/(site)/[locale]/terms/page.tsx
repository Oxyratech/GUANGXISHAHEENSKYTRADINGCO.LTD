import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { assertLocale } from "@/i18n/assert-locale";
import { buildMetadata } from "@/lib/seo";
import { applySeoOverride, getSeoOverride } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal" });
  const metadata = buildMetadata({
    locale,
    path: "/terms",
    title: t("terms.meta.title"),
    description: t("terms.meta.description"),
  });
  return applySeoOverride(
    metadata,
    await getSeoOverride({ scope: "PAGE", refKey: "terms", locale }),
  );
}

export default async function TermsRoute({ params }: PageProps<"/[locale]/terms">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  return <LegalPage locale={locale} doc="terms" />;
}
