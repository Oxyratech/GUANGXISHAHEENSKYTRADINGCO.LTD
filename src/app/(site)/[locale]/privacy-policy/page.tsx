import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { assertLocale } from "@/i18n/assert-locale";
import { buildMetadata } from "@/lib/seo";
import { applySeoOverride, getSeoOverride } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy-policy">): Promise<Metadata> {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal" });
  const metadata = buildMetadata({
    locale,
    path: "/privacy-policy",
    title: t("privacy.meta.title"),
    description: t("privacy.meta.description"),
  });
  return applySeoOverride(
    metadata,
    await getSeoOverride({ scope: "PAGE", refKey: "privacy-policy", locale }),
  );
}

export default async function PrivacyPolicyRoute({
  params,
}: PageProps<"/[locale]/privacy-policy">) {
  const locale = assertLocale((await params).locale);
  setRequestLocale(locale);
  return <LegalPage locale={locale} doc="privacy" />;
}
