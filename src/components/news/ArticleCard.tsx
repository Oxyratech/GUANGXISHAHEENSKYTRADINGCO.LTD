import { ImageSlot } from "@/components/graphics/ImageSlot";
import { DirectionalIcon } from "@/components/icons";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardLink,
  CardTitle,
} from "@/components/ui/card";
import type { Locale } from "@/i18n/locales";
import type { ArticleSummary } from "@/server/news/types";
import { ArticleMeta, type ArticleMetaLabels } from "./ArticleMeta";
import { newsArticlePath } from "./hrefs";

export interface ArticleCardLabels extends ArticleMetaLabels {
  /** Visual call to action; hidden from screen readers, which hear the title link once. */
  readArticle: string;
}

const COVER_SIZES = "(min-width: 1280px) 384px, (min-width: 640px) 45vw, 100vw";

/**
 * One article in a grid: optional cover, category and date, the title as the card's single link, a
 * three-line summary. Render inside a <ul>; the card is the <li>. `headingLevel` follows the page
 * outline (h2 on a list page whose sections have no heading of their own, otherwise h3).
 */
export function ArticleCard({
  article,
  locale,
  labels,
  headingLevel = "h3",
}: {
  article: ArticleSummary;
  locale: Locale;
  labels: ArticleCardLabels;
  headingLevel?: "h2" | "h3";
}) {
  return (
    <Card as="li" interactive className="h-full overflow-hidden">
      {article.cover ? (
        // Decorative: the title already says what the article is about.
        <ImageSlot
          fill
          src={article.cover.src}
          alt=""
          sizes={COVER_SIZES}
          className="aspect-video rounded-none"
        />
      ) : null}
      <CardHeader className="flex-1">
        <ArticleMeta
          variant="compact"
          locale={locale}
          publishedAt={article.publishedAt}
          category={article.category}
          labels={labels}
        />
        {/* Headlines are sentences, so they are set smaller than the short names on other cards. */}
        <CardTitle as={headingLevel} className="text-body-lg leading-snug font-semibold">
          <CardLink href={newsArticlePath(article.slug)}>{article.title}</CardLink>
        </CardTitle>
        <CardDescription className="line-clamp-3">{article.summary}</CardDescription>
      </CardHeader>
      <CardFooter aria-hidden className="text-label text-blue-700">
        {labels.readArticle}
        <DirectionalIcon size={16} />
      </CardFooter>
    </Card>
  );
}
