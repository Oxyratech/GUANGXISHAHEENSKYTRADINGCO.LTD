import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/ui/empty-state";
import type { CategorySlug } from "@/content/categories";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Honest empty state for a product listing: nothing has been published, products are sourced
 * against buyer requirements, and the way forward is an inquiry (with the category as context).
 */
export async function CategoryEmptyState({
  locale,
  categorySlug,
  titleAs = "h3",
  className,
}: {
  locale: Locale;
  /** The category being viewed. Omit on the all-products index. */
  categorySlug?: CategorySlug;
  titleAs?: "h2" | "h3" | "h4";
  className?: string;
}) {
  const [t, common, categories] = await Promise.all([
    getTranslations({ locale, namespace: "products" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "categories" }),
  ]);

  const copy = categorySlug
    ? {
        title: t("empty.category.title"),
        description: t("empty.category.description", {
          category: categories(`${categorySlug}.name`),
        }),
        action: t("empty.category.action"),
        href: `/inquiry?category=${encodeURIComponent(categorySlug)}`,
      }
    : {
        title: t("empty.index.title"),
        description: t("empty.index.description"),
        action: common("cta.sendInquiry"),
        href: "/inquiry",
      };

  return (
    <EmptyState
      icon={<Icon name="PackageSearch" />}
      title={copy.title}
      description={copy.description}
      action={<ButtonLink href={copy.href}>{copy.action}</ButtonLink>}
      titleAs={titleAs}
      className={cn("rounded-lg border border-dashed border-line-strong bg-white", className)}
    />
  );
}
