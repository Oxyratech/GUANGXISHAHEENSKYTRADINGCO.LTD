import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A support reference (e.g. an error digest) always comes with its translated label. */
type ReferenceProps =
  | { referenceId?: undefined; referenceLabel?: undefined }
  | { referenceId: string; referenceLabel: string };

/**
 * Failure state for a region or page (role="alert"). `action` is the retry control, usually a
 * <Button onClick={reset}>. Say what failed and what the visitor can do; never show stack traces.
 */
export function ErrorState({
  title,
  description,
  action,
  referenceId,
  referenceLabel,
  titleAs: Title = "h2",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  titleAs?: "h1" | "h2" | "h3" | "p";
  className?: string;
} & ReferenceProps) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-5 px-6 py-14 text-center", className)}
    >
      <div
        aria-hidden
        className="grid size-12 place-items-center rounded-lg border border-danger-600/20 bg-danger-50 text-danger-600"
      >
        <CircleAlert className="size-6" />
      </div>
      <div className="grid max-w-md gap-2">
        <Title className="text-h3 text-navy-900">{title}</Title>
        {description ? <p className="text-body text-ink-muted">{description}</p> : null}
      </div>
      {action}
      {referenceId ? (
        <p className="text-caption text-ink-subtle">
          {referenceLabel}: <bdi className="font-mono">{referenceId}</bdi>
        </p>
      ) : null}
    </div>
  );
}
