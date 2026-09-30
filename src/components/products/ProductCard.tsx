import Image from "next/image";
import { getTranslations } from "next-intl/server";
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
import type { CategorySlug } from "@/content/categories";
import type { Locale } from "@/i18n/locales";
import type { ProductSummary } from "@/server/products";
import { contentLanguageProps } from "./content-language";

const IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/** The page-language words a card needs, resolved once per list rather than once per card. */
export async function getProductCardText(locale: Locale) {
  const [common, categories] = await Promise.all([
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "categories" }),
  ]);
  return {
    viewDetails: common("cta.viewDetails"),
    categoryName: (slug: CategorySlug) => categories(`${slug}.name`),
  };
}

export type ProductCardText = Awaited<ReturnType<typeof getProductCardText>>;

export interface ProductCardViewProps {
  product: ProductSummary;
  locale: Locale;
  text: ProductCardText;
  /** Level of the card's title. Defaults to 3. */
  headingLevel?: 2 | 3 | 4;
  /** Show the category name above the title (lists that mix categories). */
  showCategory?: boolean;
}

/**
 * A published product: image, name and short description, the whole card linking to the product
 * page. No price, MOQ, lead time or stock is shown, because none is held. Text that fell back to
 * English inside an Arabic or Chinese page is marked with its own lang and dir.
 */
export function ProductCardView({
  product,
  locale,
  text,
  headingLevel = 3,
  showCategory = false,
}: ProductCardViewProps) {
  const { image } = product;
  const heading = `h${headingLevel}` as const;
  const href = `/products/${product.categorySlug}/${product.slug}`;

  return (
    <Card as="article" interactive className="h-full overflow-hidden">
      <div className="relative aspect-4/3 border-b border-line bg-white">
        {image ? (
          <Image
            src={image.src}
            // The title already names the product; a photo captioned with the same words adds noise.
            alt={image.alt === product.name ? "" : image.alt}
            fill
            sizes={IMAGE_SIZES}
            className="object-contain p-4"
          />
        ) : (
          <div aria-hidden className="absolute inset-0">
            <ImageSlot
              fill
              sizes={IMAGE_SIZES}
              alt={product.name}
              tone="light"
              variant="sourcing"
              className="h-full w-full rounded-none border-0"
            />
          </div>
        )}
      </div>
      <CardHeader className="flex-1 gap-3">
        {showCategory ? (
          <p className="text-eyebrow text-blue-600">{text.categoryName(product.categorySlug)}</p>
        ) : null}
        <div className="grid gap-2" {...contentLanguageProps(product.contentLocale, locale)}>
          <CardTitle as={heading}>
            <CardLink href={href}>{product.name}</CardLink>
          </CardTitle>
          {product.shortDescription ? (
            <CardDescription className="line-clamp-3">{product.shortDescription}</CardDescription>
          ) : null}
        </div>
      </CardHeader>
      <CardFooter>
        <span aria-hidden className="inline-flex items-center gap-1 text-label text-blue-700">
          {text.viewDetails}
          <DirectionalIcon size={16} />
        </span>
      </CardFooter>
    </Card>
  );
}

export async function ProductCard(props: Omit<ProductCardViewProps, "text">) {
  return <ProductCardView {...props} text={await getProductCardText(props.locale)} />;
}
