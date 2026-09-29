import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Small uppercase label above a heading, led by a short gold rule. The rule sits at the inline
 * start, so it mirrors in RTL. Light text inside a navy Section or PageHero (group/tone).
 */
export function Eyebrow({
  children,
  centered = false,
  className,
}: {
  children: ReactNode;
  centered?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 text-eyebrow text-blue-600 group-data-[tone=navy]/tone:text-gold-300",
        centered && "justify-center",
        className,
      )}
    >
      <span
        aria-hidden
        className="h-px w-6 shrink-0 bg-gold-500 group-data-[tone=navy]/tone:bg-gold-300"
      />
      {children}
    </p>
  );
}
