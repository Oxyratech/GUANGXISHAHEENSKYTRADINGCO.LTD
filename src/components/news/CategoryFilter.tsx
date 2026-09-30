import { SmartLink } from "@/components/ui/smart-link";
import { cn } from "@/lib/utils";
import type { NewsCategorySummary } from "@/server/news/types";
import { newsListHref } from "./hrefs";

const itemState = (isActive: boolean) =>
  isActive
    ? "border-navy-900 bg-navy-900 text-white"
    : "border-line bg-white text-navy-900 hover:border-line-strong hover:bg-surface";

export interface CategoryFilterLabels {
  /** Heading above the list and accessible name of the navigation. */
  heading: string;
  /** The entry that clears the filter. */
  all: string;
}

const ITEM =
  "inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-4 text-label transition-colors";

/**
 * Category links for the news list: chips that wrap on a phone, a vertical list from lg. Each entry
 * is a real link (works without JavaScript, crawlable); the current one carries aria-current and is
 * not colour-only, since it also switches to the filled style. Choosing a category resets the page
 * and any tag filter. Renders nothing when there is nothing to choose between.
 */
export function CategoryFilter({
  categories,
  activeSlug,
  labels,
  className,
}: {
  categories: readonly NewsCategorySummary[];
  activeSlug?: string;
  labels: CategoryFilterLabels;
  className?: string;
}) {
  if (categories.length === 0) return null;
  const active = activeSlug?.toLowerCase();

  return (
    <nav aria-label={labels.heading} className={className}>
      <p className="mb-3 text-eyebrow text-ink-subtle" aria-hidden>
        {labels.heading}
      </p>
      <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1.5">
        <li className="lg:w-full">
          <SmartLink
            href={newsListHref()}
            aria-current={active === undefined ? "page" : undefined}
            className={cn(ITEM, itemState(active === undefined))}
          >
            {labels.all}
          </SmartLink>
        </li>
        {categories.map((category) => {
          const isActive = category.slug.toLowerCase() === active;
          return (
            <li key={category.slug} className="lg:w-full">
              <SmartLink
                href={newsListHref({ category: category.slug })}
                aria-current={isActive ? "page" : undefined}
                className={cn(ITEM, itemState(isActive))}
              >
                <span>{category.name}</span>
                <bdi className="text-caption tabular-nums opacity-80">{category.count}</bdi>
              </SmartLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
