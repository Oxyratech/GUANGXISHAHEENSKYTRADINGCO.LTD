import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  info: {
    icon: Info,
    role: "status",
    box: "border-blue-200 bg-blue-50",
    iconColor: "text-blue-600",
  },
  success: {
    icon: CircleCheck,
    role: "status",
    box: "border-success-600/25 bg-success-50",
    iconColor: "text-success-600",
  },
  warning: {
    icon: TriangleAlert,
    role: "alert",
    box: "border-warning-700/25 bg-warning-50",
    iconColor: "text-warning-700",
  },
  danger: {
    icon: CircleAlert,
    role: "alert",
    box: "border-danger-600/25 bg-danger-50",
    iconColor: "text-danger-600",
  },
} as const satisfies Record<
  string,
  { icon: LucideIcon; role: "status" | "alert"; box: string; iconColor: string }
>;

export type AlertVariant = keyof typeof VARIANTS;

/**
 * Inline message. danger/warning use role="alert" (announced immediately); info/success use
 * role="status" (announced politely). The icon shape, not only the colour, tells the types apart.
 */
export function Alert({
  variant = "info",
  title,
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & { variant?: AlertVariant; title?: ReactNode }) {
  const { icon: Icon, role, box, iconColor } = VARIANTS[variant];
  return (
    <div
      role={role}
      className={cn("flex items-start gap-3 rounded-lg border p-4 text-ink", box, className)}
      {...props}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", iconColor)} />
      <div className="grid min-w-0 gap-1">
        {title ? <p className="text-label text-ink">{title}</p> : null}
        {children ? <div className="text-small text-ink-muted">{children}</div> : null}
      </div>
    </div>
  );
}
