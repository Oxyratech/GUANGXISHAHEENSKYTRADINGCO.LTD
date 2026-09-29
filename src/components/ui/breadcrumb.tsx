/*
 * Breadcrumb trail (server-friendly). `label` is the translated aria-label of the <nav>. The last
 * item is the current page: it gets aria-current="page" and is never a link. Inside a navy
 * PageHero it switches to light text automatically. Links get a 44px hit area through padding
 * cancelled by a negative margin, so the trail stays visually compact.
 *
 *   <Breadcrumb label={t("breadcrumb")} items={[{ label: t("home"), href: "/" }, { label: page }]} />
 */
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartLink } from "./smart-link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({
  label,
  items,
  className,
}: {
  label: string;
  items: readonly BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      <ol
        className={cn(
          "flex flex-wrap items-center gap-y-1 text-small text-ink-muted",
          "group-data-[tone=navy]/tone:text-blue-100",
        )}
      >
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${index}-${item.label}`} className="inline-flex items-center">
              {isCurrent || !item.href ? (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    isCurrent && "font-medium text-navy-900 group-data-[tone=navy]/tone:text-white",
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <SmartLink
                  href={item.href}
                  className="-my-3 rounded-xs py-3 underline-offset-4 hover:text-navy-900 hover:underline group-data-[tone=navy]/tone:hover:text-white"
                >
                  {item.label}
                </SmartLink>
              )}
              {isCurrent ? null : (
                <ChevronRight
                  aria-hidden
                  className="rtl-flip mx-2 size-3.5 shrink-0 text-ink-subtle group-data-[tone=navy]/tone:text-blue-300"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
