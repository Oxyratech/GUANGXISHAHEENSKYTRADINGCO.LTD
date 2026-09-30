import { getTranslations } from "next-intl/server";
import { SmartLink } from "@/components/ui/smart-link";
import { TRADE_PROCESS_STEPS } from "@/content/process";
import type { Locale } from "@/i18n/locales";
import { formatStepNumber } from "./step-number";

/**
 * "Steps at a glance": links that jump to each step of the detailed ProcessTimeline (its list items
 * carry the `step-<id>` anchors). Sits in the hero of /global-trade/how-it-works.
 */
export async function StepJumpList({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "globalTrade" });

  return (
    <nav
      aria-labelledby="steps-at-a-glance"
      className="rounded-lg border border-line bg-white p-5 shadow-card sm:p-6"
    >
      <p id="steps-at-a-glance" className="text-eyebrow text-blue-600">
        {t("howItWorks.atAGlance")}
      </p>
      <ol role="list" className="mt-3 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-1">
        {TRADE_PROCESS_STEPS.map((step, index) => (
          <li key={step}>
            <SmartLink
              href={`#step-${step}`}
              className="flex min-h-11 items-center gap-3 rounded-md px-2 text-small text-ink hover:bg-surface hover:text-navy-900"
            >
              <span aria-hidden className="w-6 shrink-0 text-label text-blue-600 tabular-nums">
                {formatStepNumber(index)}
              </span>
              {t(`process.${step}.title`)}
            </SmartLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
