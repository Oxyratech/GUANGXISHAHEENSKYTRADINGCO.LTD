import { Badge } from "@/components/ui/badge";
import { LOCALES, type Locale } from "@/i18n/locales";

/** en/zh/ar as badges: solid green for a locale that is covered, dim for one that is missing. */
export function LocaleCoverageBadges({ present }: { present: readonly Locale[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {LOCALES.map((locale) =>
        present.includes(locale) ? (
          <Badge key={locale} variant="success">
            {locale.toUpperCase()}
          </Badge>
        ) : (
          <Badge key={locale}>{locale.toUpperCase()}</Badge>
        ),
      )}
    </div>
  );
}
