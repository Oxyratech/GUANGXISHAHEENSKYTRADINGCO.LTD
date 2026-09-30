/*
 * The "Typical Trade Process" as a visual timeline of the eight steps in content/process.ts.
 *
 *   compact   numeral, title and one-line summary. A vertical rail on small screens; from lg a
 *             four-column, two-row grid whose numerals are joined by connectors.
 *   detailed  adds the step's detail plus "what you provide" and "what we typically do", on a
 *             vertical rail with numbered nodes at every width.
 *
 * It always carries the "Typical Trade Process" label and a note that the flow is not a fixed
 * procedure, so wherever it is embedded it is never read as a promise that every step applies to
 * every order. Everything sits on logical properties: the rail, the numerals and the connectors
 * mirror in Arabic. On a navy Section it switches to light colours through the `group/tone` hook,
 * like SectionHeading does.
 */
import { getTranslations } from "next-intl/server";
import { Info } from "@/components/icons";
import { Eyebrow } from "@/components/layout/eyebrow";
import { TRADE_PROCESS_STEPS, type TradeProcessStep } from "@/content/process";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import { formatStepNumber } from "./step-number";

/** Sub-keys of globalTrade.process.<step>.provide and .do. Every step has all three. */
const LIST_KEYS = ["a", "b", "c"] as const;

/** The compact grid has four columns from lg, so steps 4 and 8 end a row and have no connector. */
const COMPACT_COLUMNS = 4;

export interface ProcessTimelineProps {
  variant?: "compact" | "detailed";
  /** Level of the step titles: 3 under a section h2 (default), 2 when the steps are the section. */
  headingLevel?: 2 | 3;
  /** Locale of the page. Left out, the request locale set by setRequestLocale is used. */
  locale?: Locale;
}

interface StepData {
  id: TradeProcessStep;
  number: string;
  title: string;
  summary: string;
  detail: string;
  provide: string[];
  actions: string[];
}

type TitleTag = "h2" | "h3";

const NODE = [
  "flex shrink-0 items-center justify-center rounded-md border border-line-strong bg-white tabular-nums text-navy-900",
  "group-data-[tone=navy]/tone:border-white/25 group-data-[tone=navy]/tone:bg-navy-800 group-data-[tone=navy]/tone:text-white",
];

const RAIL_LINE =
  "before:absolute before:start-6 before:bottom-2 before:w-px before:bg-line-strong last:before:hidden group-data-[tone=navy]/tone:before:bg-white/20";

const TITLE_TONE = "text-navy-900 group-data-[tone=navy]/tone:text-white";
const TEXT_TONE = "text-ink-muted group-data-[tone=navy]/tone:text-blue-100";

function CompactStep({
  step,
  Title,
  endsRow,
}: {
  step: StepData;
  Title: TitleTag;
  endsRow: boolean;
}) {
  return (
    <li
      className={cn(
        "relative ps-16 pb-10 last:pb-0 lg:ps-0 lg:pb-0 lg:before:hidden",
        "before:top-12",
        RAIL_LINE,
      )}
    >
      <div className="absolute start-0 top-0 flex w-12 justify-center lg:static lg:mb-4 lg:w-auto lg:items-center lg:justify-start lg:gap-4">
        <span
          aria-hidden
          className="shrink-0 text-h2 text-blue-600 tabular-nums group-data-[tone=navy]/tone:text-gold-300 lg:text-h1"
        >
          {step.number}
        </span>
        {endsRow ? null : (
          <span
            aria-hidden
            className="hidden h-px flex-1 bg-line-strong group-data-[tone=navy]/tone:bg-white/25 lg:-me-6 lg:block"
          />
        )}
      </div>
      <Title className={cn("text-body-lg font-semibold", TITLE_TONE)}>{step.title}</Title>
      <p className={cn("mt-1.5 text-small", TEXT_TONE)}>{step.summary}</p>
    </li>
  );
}

function StepList({
  id,
  label,
  items,
  tone,
}: {
  id: string;
  label: string;
  items: readonly string[];
  tone: "provide" | "actions";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5",
        tone === "provide" ? "border-line bg-white" : "border-blue-200 bg-blue-50",
      )}
    >
      <p id={id} className="text-label text-navy-900">
        {label}
      </p>
      <ul aria-labelledby={id} className="mt-3 grid gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-small text-ink-muted">
            <span
              aria-hidden
              className={cn(
                "mt-2 size-1.5 shrink-0 rounded-xs",
                tone === "provide" ? "bg-gold-500" : "bg-blue-500",
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailedStep({
  step,
  Title,
  provideLabel,
  doLabel,
}: {
  step: StepData;
  Title: TitleTag;
  provideLabel: string;
  doLabel: string;
}) {
  return (
    <li
      id={`step-${step.id}`}
      className={cn(
        "relative ps-16 pb-12 before:top-14 last:pb-0 md:ps-24 md:before:start-8 md:before:top-20",
        RAIL_LINE,
      )}
    >
      <span
        aria-hidden
        className={cn(NODE, "absolute start-0 top-0 size-12 text-h3 md:size-16 md:text-h2")}
      >
        {step.number}
      </span>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div className="grid content-start gap-3">
          <Title className={cn("text-h3", TITLE_TONE)}>{step.title}</Title>
          <p className="text-body-lg text-ink group-data-[tone=navy]/tone:text-white">
            {step.summary}
          </p>
          <p className={cn("text-body", TEXT_TONE)}>{step.detail}</p>
        </div>
        <div className="grid content-start gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <StepList
            id={`${step.id}-provide`}
            label={provideLabel}
            items={step.provide}
            tone="provide"
          />
          <StepList id={`${step.id}-do`} label={doLabel} items={step.actions} tone="actions" />
        </div>
      </div>
    </li>
  );
}

export async function ProcessTimeline({
  variant = "compact",
  headingLevel = 3,
  locale,
}: ProcessTimelineProps) {
  const t = await (locale
    ? getTranslations({ locale, namespace: "globalTrade" })
    : getTranslations("globalTrade"));

  const steps: StepData[] = TRADE_PROCESS_STEPS.map((id, index) => ({
    id,
    number: formatStepNumber(index),
    title: t(`process.${id}.title`),
    summary: t(`process.${id}.summary`),
    detail: t(`process.${id}.detail`),
    provide: LIST_KEYS.map((key) => t(`process.${id}.provide.${key}`)),
    actions: LIST_KEYS.map((key) => t(`process.${id}.do.${key}`)),
  }));

  const Title: TitleTag = headingLevel === 2 ? "h2" : "h3";
  const label = t("process.label");
  const detailed = variant === "detailed";

  return (
    <div className="grid gap-8" data-variant={variant}>
      <div aria-hidden>
        <Eyebrow>{label}</Eyebrow>
      </div>
      <ol
        role="list"
        aria-label={label}
        className={cn(
          "grid",
          !detailed && "max-w-2xl lg:max-w-none lg:grid-cols-4 lg:gap-x-8 lg:gap-y-12",
        )}
      >
        {steps.map((step, index) =>
          detailed ? (
            <DetailedStep
              key={step.id}
              step={step}
              Title={Title}
              provideLabel={t("process.provideLabel")}
              doLabel={t("process.doLabel")}
            />
          ) : (
            <CompactStep
              key={step.id}
              step={step}
              Title={Title}
              endsRow={(index + 1) % COMPACT_COLUMNS === 0}
            />
          ),
        )}
      </ol>
      <p className={cn("flex max-w-3xl items-start gap-3 text-small", TEXT_TONE)}>
        <Info
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-blue-600 group-data-[tone=navy]/tone:text-gold-300"
        />
        {t("process.note")}
      </p>
    </div>
  );
}
