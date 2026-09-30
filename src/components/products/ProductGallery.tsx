import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ImageSlot } from "@/components/graphics/ImageSlot";
import type { Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import type { PublicProductImage } from "@/server/products";
import { ProductGalleryViewer } from "./ProductGalleryViewer";

/**
 * The images of one product, primary image first. Alt text comes from the images' own translations
 * (falling back to English, then to the product name).
 *  - no image: the site's vector placeholder, labelled as "no photo published" (never a stock photo)
 *  - one image: a static frame, no client JavaScript
 *  - several: the keyboard-operable viewer with thumbnails
 */
export async function ProductGallery({
  images,
  name,
  locale,
  className,
}: {
  images: readonly PublicProductImage[];
  name: string;
  locale: Locale;
  className?: string;
}) {
  const t = await getTranslations({ locale, namespace: "products" });
  const [first] = images;

  if (!first) {
    return (
      <ImageSlot
        width={4}
        height={3}
        alt={t("gallery.noImage", { name })}
        tone="light"
        variant="sourcing"
        className={cn("w-full", className)}
      />
    );
  }

  if (images.length === 1) {
    return (
      <div
        className={cn(
          "relative aspect-4/3 overflow-hidden rounded-lg border border-line bg-white",
          className,
        )}
      >
        <Image
          src={first.src}
          alt={first.alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          preload
          className="object-contain p-4"
        />
      </div>
    );
  }

  return (
    <ProductGalleryViewer
      // Another product's gallery must start from its own first image, not from this one's selection.
      key={first.src}
      className={className}
      thumbnailsLabel={t("gallery.thumbnails")}
      images={images.map((image, index) => ({
        src: image.src,
        alt: image.alt,
        thumbnailLabel: t("gallery.showImage", {
          position: index + 1,
          total: images.length,
          alt: image.alt,
        }),
      }))}
    />
  );
}
