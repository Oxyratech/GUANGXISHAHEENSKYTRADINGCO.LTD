/*
 * Inner-page hero: the page's only <h1>. It is a complete full-width band (it brings its own
 * Container), so place it directly in <main>. Vary it to keep pages from looking identical:
 *   tone   "light" (default, quiet surface) | "navy" (deep band for anchor pages)
 *   size   "compact" (utility/legal/list pages) | "expanded" (landing pages such as About, Business)
 *   aside  optional panel beside the text from lg (key facts, a summary card, a vector graphic)
 * `breadcrumb` takes a <Breadcrumb>; `actions` takes ButtonLinks. Never use it for LCP imagery.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "./container";
import { Eyebrow } from "./eyebrow";

const TONES = {
  light: "border-b border-line bg-surface text-ink",
  navy: "border-b border-navy-700 bg-navy-900 bg-radial-[ellipse_at_top] from-navy-700/50 to-transparent to-65% text-white",
} as const;

const SIZES = {
  compact: { padding: "py-10 md:py-14", title: "text-h2" },
  expanded: { padding: "py-16 md:py-24", title: "text-h1" },
} as const;

export interface PageHeroProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  /** id of the <h1>, e.g. for aria-labelledby or skip targets. */
  id?: string;
  className?: string;
}

export function PageHero({
  title,
  eyebrow,
  description,
  breadcrumb,
  actions,
  aside,
  tone = "light",
  size = "compact",
  id,
  className,
}: PageHeroProps) {
  return (
    <header data-tone={tone} className={cn("group/tone", TONES[tone], className)}>
      <Container>
        <div className={SIZES[size].padding}>
          {breadcrumb ? <div className="mb-6 md:mb-8">{breadcrumb}</div> : null}
          <div
            className={cn(
              "grid gap-10",
              aside && "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end lg:gap-16",
            )}
          >
            <div className="grid content-start gap-5">
              {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
              <h1
                id={id}
                className={cn(
                  "max-w-3xl text-navy-900 group-data-[tone=navy]/tone:text-white",
                  SIZES[size].title,
                )}
              >
                {title}
              </h1>
              {description ? (
                <p className="max-w-2xl text-body-lg text-ink-muted group-data-[tone=navy]/tone:text-blue-100">
                  {description}
                </p>
              ) : null}
              {actions ? (
                <div className="mt-2 flex flex-wrap items-center gap-3">{actions}</div>
              ) : null}
            </div>
            {aside ? <div>{aside}</div> : null}
          </div>
        </div>
      </Container>
    </header>
  );
}
