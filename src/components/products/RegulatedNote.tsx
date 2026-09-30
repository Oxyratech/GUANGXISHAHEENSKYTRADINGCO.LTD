import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/alert";
import type { Locale } from "@/i18n/locales";

/**
 * Compliance note for a regulated category. The wording is the shared `categories.regulatedNote`:
 * such goods may need licenses, filings or approvals, and the registered scope does not show that
 * any is held.
 */
export async function RegulatedNote({ locale, className }: { locale: Locale; className?: string }) {
  const [t, categories] = await Promise.all([
    getTranslations({ locale, namespace: "products" }),
    getTranslations({ locale, namespace: "categories" }),
  ]);
  return (
    <Alert variant="info" title={t("regulated.title")} className={className}>
      {categories("regulatedNote")}
    </Alert>
  );
}
