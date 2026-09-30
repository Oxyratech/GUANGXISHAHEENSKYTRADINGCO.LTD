import { CircleCheck } from "lucide-react";
import { useId, type ReactNode, type RefObject } from "react";

/**
 * Confirmation that a submission is stored. It replaces the form, so it takes focus (tabIndex -1)
 * when it appears, and it is a status region: assistive technology reads the title and the code.
 * The reference code is Latin, so it is isolated with dir="ltr" inside right-to-left pages.
 */
export function SuccessPanel({
  title,
  lead,
  referenceLabel,
  referenceCode,
  referenceHint,
  next,
  actions,
  ref,
}: {
  title: string;
  lead: string;
  referenceLabel: string;
  referenceCode: string;
  referenceHint: string;
  next: string;
  actions: ReactNode;
  ref: RefObject<HTMLDivElement | null>;
}) {
  const headingId = useId();
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-labelledby={headingId}
      className="grid gap-6 focus-visible:outline-none"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-lg border border-success-600/25 bg-success-50 text-success-600"
        >
          <CircleCheck className="size-6" />
        </span>
        <div className="grid gap-2">
          <h2 id={headingId} className="text-h3 text-navy-900">
            {title}
          </h2>
          <p className="text-body text-ink-muted">{lead}</p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface p-5">
        <p className="text-label text-ink-muted">{referenceLabel}</p>
        <p
          dir="ltr"
          className="mt-1 text-start font-mono text-h3 tracking-wide break-all text-navy-900 select-all"
        >
          {referenceCode}
        </p>
        <p className="mt-2 text-small text-ink-muted">{referenceHint}</p>
      </div>

      <p className="text-body text-ink-muted">{next}</p>
      <div className="flex flex-wrap items-center gap-3">{actions}</div>
    </div>
  );
}
