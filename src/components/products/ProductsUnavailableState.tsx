import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button-link";
import { ErrorState } from "@/components/ui/error-state";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/** Shown when published products cannot be read (database unreachable). Never a stack trace. */
export async function ProductsUnavailableState({
  locale,
  titleAs = "h3",
  className,
}: {
  locale: Locale;
  titleAs?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: "products" }),
    getTranslations({ locale, namespace: "common" }),
  ]);
  return (
    <ErrorState
      title={t("unavailable.title")}
      description={t("unavailable.description")}
      action={<ButtonLink href="/inquiry">{common("cta.sendInquiry")}</ButtonLink>}
      titleAs={titleAs}
      className={cn("rounded-lg border border-line bg-white", className)}
    />
  );
}
