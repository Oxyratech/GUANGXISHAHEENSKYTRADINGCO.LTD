import { getTranslations } from "next-intl/server";
import { Info } from "@/components/icons";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/** States that categories are areas available for sourcing and trade, not current stock. */
export async function AvailabilityNote({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const categories = await getTranslations({ locale, namespace: "categories" });
  return (
    <p
      className={cn(
        "flex items-start gap-3 rounded-lg border border-line bg-surface p-4 text-small text-ink-muted",
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-blue-600" />
      <span>{categories("availabilityNote")}</span>
    </p>
  );
}
