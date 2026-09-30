import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import type { ProductSummary } from "@/server/products";
import { getProductCardText, ProductCardView } from "./ProductCard";

/** A responsive list of product cards. Each card is a list item, so the count is announced. */
export async function ProductGrid({
  products,
  locale,
  headingLevel = 3,
  showCategory = false,
  className,
}: {
  products: readonly ProductSummary[];
  locale: Locale;
  headingLevel?: 2 | 3 | 4;
  showCategory?: boolean;
  className?: string;
}) {
  const text = await getProductCardText(locale);
  return (
    <ul className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {products.map((product) => (
        <li key={`${product.categorySlug}/${product.slug}`}>
          <ProductCardView
            product={product}
            locale={locale}
            text={text}
            headingLevel={headingLevel}
            showCategory={showCategory}
          />
        </li>
      ))}
    </ul>
  );
}
