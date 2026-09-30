import type { ReactNode } from "react";
import { Info, TriangleAlert } from "@/components/icons";
import { cn } from "@/lib/utils";

const TONES = {
  info: { icon: Info, box: "border-blue-200 bg-blue-50", iconColor: "text-blue-600" },
  warning: {
    icon: TriangleAlert,
    box: "border-warning-700/25 bg-warning-50",
    iconColor: "text-warning-700",
  },
} as const;

/**
 * A note set apart from the running text. Unlike ui/Alert it carries no live-region role: it is
 * part of the page content, not a message that appears in response to something.
 */
export function Callout({
  tone = "info",
  title,
  titleAs: Title = "h3",
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  title?: ReactNode;
  titleAs?: "h2" | "h3" | "p";
  children: ReactNode;
  className?: string;
}) {
  const { icon: Icon, box, iconColor } = TONES[tone];
  return (
    <div className={cn("flex items-start gap-4 rounded-lg border p-5 md:p-6", box, className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", iconColor)} />
      <div className="grid min-w-0 gap-2">
        {title ? <Title className="text-body font-semibold text-navy-900">{title}</Title> : null}
        <div className="text-body text-ink-muted">{children}</div>
      </div>
    </div>
  );
}
