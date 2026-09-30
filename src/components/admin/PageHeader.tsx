import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderCrumb {
  label: string;
  /** Omit on the last item: the current page is never a link. */
  href?: string;
}

/**
 * Title block of an admin page: breadcrumbs, the page's one <h1>, a short description and the
 * page-level actions (buttons that create or export). Every page starts with exactly one.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: readonly PageHeaderCrumb[];
  className?: string;
}) {
  return (
    <header className={cn("mb-6 grid gap-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-y-1 text-small text-ink-muted">
            {breadcrumbs.map((crumb, index) => {
              const isCurrent = index === breadcrumbs.length - 1;
              return (
                <li key={`${index}-${crumb.label}`} className="inline-flex items-center">
                  {crumb.href && !isCurrent ? (
                    <Link
                      href={crumb.href}
                      className="rounded-xs underline-offset-4 hover:text-navy-900 hover:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isCurrent ? "page" : undefined}
                      className={cn(isCurrent && "font-medium text-navy-900")}
                    >
                      {crumb.label}
                    </span>
                  )}
                  {isCurrent ? null : (
                    <ChevronRight aria-hidden className="mx-1.5 size-3.5 text-ink-subtle" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-h3 text-navy-900">{title}</h1>
          {description ? (
            <p className="max-w-prose text-small text-ink-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
