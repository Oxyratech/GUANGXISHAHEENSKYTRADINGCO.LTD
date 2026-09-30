import { getTranslations } from "next-intl/server";
import { Check } from "@/components/icons";
import type { Locale } from "@/i18n/locales";

const ITEMS = ["product", "quantity", "specification", "destination", "price", "files"] as const;

/** What a useful inquiry contains: the first thing beside the form, so it is read before typing. */
export async function InquiryGuidance({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "inquiry" });
  return (
    <section aria-labelledby="inquiry-guidance-title" className="grid content-start gap-5">
      <div className="grid gap-2">
        <h2 id="inquiry-guidance-title" className="text-h3 text-navy-900">
          {t("guidance.title")}
        </h2>
        <p className="text-body text-ink-muted">{t("guidance.intro")}</p>
      </div>
      <ul className="grid gap-3">
        {ITEMS.map((item) => (
          <li key={item} className="flex items-start gap-3 text-body text-ink">
            <span
              aria-hidden
              className="mt-1 grid size-5 shrink-0 place-items-center rounded-sm bg-blue-50 text-blue-600"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            {t(`guidance.items.${item}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}
