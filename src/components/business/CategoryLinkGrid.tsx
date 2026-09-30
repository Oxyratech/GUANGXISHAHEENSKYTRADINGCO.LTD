import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardLink, CardTitle } from "@/components/ui/card";
import type { CategoryDefinition } from "@/content/categories";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Registered categories as links to /products/<slug>. `dense` shows the name only, for the full
 * list of twelve; otherwise each card adds the one-line summary. Regulated categories carry a
 * text badge (never colour alone).
 */
export async function CategoryLinkGrid({
  locale,
  categories,
  dense = false,
}: {
  locale: Locale;
  categories: readonly CategoryDefinition[];
  dense?: boolean;
}) {
  const [t, names] = await Promise.all([
    getTranslations({ locale, namespace: "business" }),
    getTranslations({ locale, namespace: "categories" }),
  ]);

  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", dense && "xl:grid-cols-4")}>
      {categories.map((category) => (
        <li key={category.slug} className="flex">
          <Card
            interactive
            className={cn("w-full flex-row gap-4 p-4", dense ? "items-center" : "items-start")}
          >
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface text-navy-700"
            >
              <Icon name={category.icon} size={20} />
            </span>
            <div className="grid min-w-0 gap-1.5">
              <CardTitle as="p" className="text-body font-semibold">
                <CardLink href={`/products/${category.slug}`}>
                  {names(`${category.slug}.name`)}
                </CardLink>
              </CardTitle>
              {dense ? null : (
                <CardDescription>{names(`${category.slug}.summary`)}</CardDescription>
              )}
              {category.regulated ? (
                <Badge variant="warning" className="w-fit">
                  {t("shared.categories.regulatedBadge")}
                </Badge>
              ) : null}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
