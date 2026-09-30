import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { SmartLink } from "@/components/ui/smart-link";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import type { NewsCategoryRef, NewsTagRef } from "@/server/news/types";
import { formatArticleDate } from "./format-date";
import { newsListHref } from "./hrefs";

const PILL =
  "relative inline-flex min-h-8 items-center rounded-md border px-3 text-caption font-medium before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']";

const PILL_LINK = {
  category: cn(PILL, "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"),
  tag: cn(
    PILL,
    "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-navy-900",
  ),
} as const;

export interface ArticleMetaLabels {
  /** Read out before the date, e.g. "Published". */
  published: string;
  /** Read out before the category, e.g. "Category". */
  category: string;
  /** Accessible name of the tag list, e.g. "Tags". */
  tags: string;
}

/**
 * The line of facts about an article. "compact" (cards) shows category and date as plain text, since
 * the whole card is already one link. "full" (the article page) adds the byline and turns category
 * and tags into links to the filtered list. Links are padded to a 44px hit area without growing.
 */
export function ArticleMeta({
  locale,
  publishedAt,
  byline,
  category,
  tags = [],
  labels,
  variant = "full",
  className,
}: {
  locale: Locale;
  /** ISO 8601. */
  publishedAt: string;
  /** Translated "By <author>" with the name already isolated for bidi text. */
  byline?: ReactNode;
  category?: NewsCategoryRef | null;
  tags?: readonly NewsTagRef[];
  labels: ArticleMetaLabels;
  variant?: "compact" | "full";
  className?: string;
}) {
  const time = (
    <time dateTime={publishedAt}>
      <span className="sr-only">{labels.published}: </span>
      {formatArticleDate(publishedAt, locale)}
    </time>
  );

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
        {category ? (
          <Badge variant="blue">
            <span className="sr-only">{labels.category}: </span>
            {category.name}
          </Badge>
        ) : null}
        <span className="text-caption text-ink-subtle">{time}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-4 text-small text-ink-muted",
        className,
      )}
    >
      {byline ? <p>{byline}</p> : null}
      <p>{time}</p>
      {category ? (
        <SmartLink href={newsListHref({ category: category.slug })} className={PILL_LINK.category}>
          <span className="sr-only">{labels.category}: </span>
          {category.name}
        </SmartLink>
      ) : null}
      {tags.length > 0 ? (
        <ul aria-label={labels.tags} className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag.slug}>
              <SmartLink href={newsListHref({ tag: tag.slug })} className={PILL_LINK.tag}>
                {tag.name}
              </SmartLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
