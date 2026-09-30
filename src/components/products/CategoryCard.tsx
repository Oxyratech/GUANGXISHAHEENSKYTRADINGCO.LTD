import { getLocale, getTranslations } from "next-intl/server";
import { DirectionalIcon, Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardLink,
  CardTitle,
} from "@/components/ui/card";
import { getCategory, type CategorySlug } from "@/content/categories";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

export interface CategoryCardProps {
  slug: CategorySlug;
  /** Pass the page's locale. When left out it is read from the request (after setRequestLocale). */
  locale?: Locale;
  /** Level of the card's title, so the page outline stays valid. Defaults to 3. */
  headingLevel?: 2 | 3 | 4;
  /** A single row (icon, name, chevron) for "other categories" strips; the summary is left out. */
  compact?: boolean;
  /** Published products in the category. Shown only when above zero: no count is ever invented. */
  productCount?: number;
}

const ICON_TILE = "grid shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700";

/**
 * A product category as a card that links to /products/<slug>. Categories are areas of registered
 * trade, not stock, so the card carries a name, a summary and, for regulated goods, a badge.
 */
export async function CategoryCard({
  slug,
  locale,
  headingLevel = 3,
  compact = false,
  productCount,
}: CategoryCardProps) {
  const category = getCategory(slug);
  if (!category) return null;

  const activeLocale = locale ?? (await getLocale());
  const [categories, t] = await Promise.all([
    getTranslations({ locale: activeLocale, namespace: "categories" }),
    getTranslations({ locale: activeLocale, namespace: "products" }),
  ]);
  const heading = `h${headingLevel}` as const;
  const href = `/products/${slug}`;

  if (compact) {
    return (
      <Card interactive className="h-full">
        <div className="flex items-center gap-3 p-4">
          <span aria-hidden className={cn(ICON_TILE, "size-10")}>
            <Icon name={category.icon} />
          </span>
          <CardTitle as={heading} className="min-w-0 flex-1 text-body font-semibold">
            <CardLink href={href}>{categories(`${slug}.name`)}</CardLink>
          </CardTitle>
          {category.regulated ? <Badge variant="gold">{t("regulated.badge")}</Badge> : null}
          <DirectionalIcon kind="chevron" size={18} className="shrink-0 text-ink-subtle" />
        </div>
      </Card>
    );
  }

  return (
    <Card interactive className="h-full">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <span aria-hidden className={cn(ICON_TILE, "size-12")}>
            <Icon name={category.icon} size={24} />
          </span>
          {category.regulated ? <Badge variant="gold">{t("regulated.badge")}</Badge> : null}
        </div>
        <CardTitle as={heading}>
          <CardLink href={href}>{categories(`${slug}.name`)}</CardLink>
        </CardTitle>
        <CardDescription>{categories(`${slug}.summary`)}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto justify-between gap-4 text-small">
        <span className="text-ink-muted">
          {productCount && productCount > 0 ? t("card.count", { count: productCount }) : null}
        </span>
        <span aria-hidden className="inline-flex items-center gap-1 text-label text-blue-700">
          {t("card.explore")}
          <DirectionalIcon size={16} />
        </span>
      </CardFooter>
    </Card>
  );
}
