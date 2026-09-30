import { getFormatter, getTranslations } from "next-intl/server";
import { DirectionalIcon } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { SmartLink } from "@/components/ui/smart-link";
import type { Locale } from "@/i18n/locales";

const STEPS = ["review", "clarify", "source"] as const;

/**
 * What happens after sending, told as the typical process and never as a promise, and how the
 * details are handled. It sits below the form on a phone and under the guidance from `lg`.
 */
export async function InquiryAside({ locale }: { locale: Locale }) {
  const [t, format] = await Promise.all([
    getTranslations({ locale, namespace: "inquiry" }),
    getFormatter({ locale }),
  ]);

  return (
    <div className="grid content-start gap-8">
      <section aria-labelledby="inquiry-next-title" className="grid gap-5">
        <div className="grid gap-2">
          <h2 id="inquiry-next-title" className="text-h3 text-navy-900">
            {t("next.title")}
          </h2>
          <p className="text-small text-ink-muted">{t("next.note")}</p>
        </div>
        <ol className="grid gap-4">
          {STEPS.map((step, index) => (
            <li key={step} className="grid grid-cols-[auto_1fr] items-start gap-4">
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-md border border-line-strong bg-white text-label text-navy-900"
              >
                {format.number(index + 1)}
              </span>
              <div className="grid gap-1">
                <h3 className="text-label text-navy-900">{t(`next.steps.${step}.title`)}</h3>
                <p className="text-small text-ink-muted">{t(`next.steps.${step}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
        <SmartLink
          href="/global-trade/how-it-works"
          className="inline-flex min-h-11 items-center gap-2 text-label text-blue-600 underline-offset-4 hover:text-blue-800 hover:underline"
        >
          {t("next.processLink")}
          <DirectionalIcon size={16} />
        </SmartLink>
      </section>

      <Card as="section" aria-labelledby="inquiry-privacy-title" className="gap-2 bg-white p-5">
        <h2 id="inquiry-privacy-title" className="text-label text-navy-900">
          {t("privacy.title")}
        </h2>
        <p className="text-small text-ink-muted">
          {t.rich("privacy.body", {
            link: (chunks) => (
              <SmartLink
                href="/privacy-policy"
                className="text-blue-600 underline underline-offset-4 hover:text-blue-800"
              >
                {chunks}
              </SmartLink>
            ),
          })}
        </p>
      </Card>
    </div>
  );
}
