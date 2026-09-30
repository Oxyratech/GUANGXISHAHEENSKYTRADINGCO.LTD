import { LOCALES, type Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

const LOCALE_LABEL: Record<Locale, string> = { en: "EN", zh: "ZH", ar: "AR" };

/** One small chip per locale: filled when that locale has its own translation, outlined when not. */
export function TranslationChips({ present }: { present: readonly Locale[] }) {
  return (
    <ul className="flex items-center gap-1" aria-label="Translations present">
      {LOCALES.map((locale) => {
        const has = present.includes(locale);
        return (
          <li key={locale}>
            <span
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-sm border text-caption font-medium",
                has
                  ? "border-success-600/25 bg-success-50 text-success-600"
                  : "border-dashed border-line-strong text-ink-subtle",
              )}
              title={`${LOCALE_LABEL[locale]}: ${has ? "translated" : "not translated"}`}
            >
              {LOCALE_LABEL[locale]}
              <span className="sr-only">{has ? " translated" : " not translated"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
