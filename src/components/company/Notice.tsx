import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Info, TriangleAlert } from "@/components/icons";
import { cn } from "@/lib/utils";

const TONES = {
  info: { box: "border-blue-200 bg-blue-50", icon: "text-blue-600", defaultIcon: Info },
  caution: {
    box: "border-warning-700/25 bg-warning-50",
    icon: "text-warning-700",
    defaultIcon: TriangleAlert,
  },
  highlight: { box: "border-gold-200 bg-gold-50", icon: "text-gold-700", defaultIcon: Info },
} as const;

const SIZES = {
  sm: { box: "p-5", title: "text-label", body: "text-small" },
  lg: { box: "p-6 sm:p-8", title: "text-h3", body: "text-body" },
} as const;

/**
 * A static callout for a note that belongs to the content around it. Unlike Alert it has no live
 * region role: nothing here changes after load, so nothing should be announced.
 */
export function Notice({
  tone = "info",
  size = "sm",
  icon,
  title,
  titleAs: Title = "p",
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  icon?: LucideIcon;
  title?: ReactNode;
  titleAs?: "p" | "h3";
  children: ReactNode;
  className?: string;
}) {
  const { box, icon: iconColor, defaultIcon } = TONES[tone];
  const scale = SIZES[size];
  const Icon = icon ?? defaultIcon;
  return (
    <div className={cn("flex items-start gap-4 rounded-lg border", box, scale.box, className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", iconColor)} />
      <div className="grid min-w-0 gap-2">
        {title ? <Title className={cn("text-navy-900", scale.title)}>{title}</Title> : null}
        <div className={cn("grid gap-2 text-ink-muted", scale.body)}>{children}</div>
      </div>
    </div>
  );
}
