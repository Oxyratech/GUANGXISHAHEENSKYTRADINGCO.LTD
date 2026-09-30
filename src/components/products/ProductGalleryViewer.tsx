"use client";

/*
 * Interactive gallery for a product with several images: one large image and a row of thumbnails.
 * It follows the WAI-ARIA tabs pattern (the same one the APG uses for a carousel with slide
 * pickers): each thumbnail is a tab, the large image is its tabpanel, Tab enters the row, the arrow
 * keys (mirrored in RTL) and Home/End move between images, and the selected image follows focus.
 * Every string arrives translated as a prop, so no message catalogue reaches the browser.
 */
import Image from "next/image";
import { Tabs as TabsPrimitive } from "radix-ui";
import { useState } from "react";
import { useUiDirection } from "@/components/ui/direction";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  src: string;
  /** Alt text of the large image. */
  alt: string;
  /** Accessible name of the thumbnail tab, e.g. "Image 2 of 4: Steel bolts, side view". */
  thumbnailLabel: string;
}

const MAIN_SIZES = "(min-width: 1024px) 50vw, 100vw";

export function ProductGalleryViewer({
  images,
  thumbnailsLabel,
  className,
}: {
  images: readonly GalleryImage[];
  /** Accessible name of the thumbnail row, e.g. "Choose an image". */
  thumbnailsLabel: string;
  className?: string;
}) {
  const [selected, setSelected] = useState("0");
  const dir = useUiDirection();

  return (
    <TabsPrimitive.Root
      value={selected}
      onValueChange={setSelected}
      dir={dir}
      className={cn("grid gap-3", className)}
    >
      {images.map((image, index) => (
        <TabsPrimitive.Content
          key={image.src}
          value={String(index)}
          // The image is not interactive, so it is not a tab stop of its own: Tab goes from the
          // selected thumbnail straight on, and the arrow keys change the image.
          tabIndex={-1}
          className="relative aspect-4/3 overflow-hidden rounded-lg border border-line bg-white"
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes={MAIN_SIZES}
            preload={index === 0}
            className="object-contain p-4"
          />
        </TabsPrimitive.Content>
      ))}
      <TabsPrimitive.List aria-label={thumbnailsLabel} className="flex flex-wrap gap-2">
        {images.map((image, index) => (
          <TabsPrimitive.Trigger
            key={image.src}
            value={String(index)}
            aria-label={image.thumbnailLabel}
            className={cn(
              "relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line bg-white transition-colors duration-150",
              "hover:border-line-strong",
              "data-[state=active]:border-navy-700 data-[state=active]:ring-1 data-[state=active]:ring-navy-700",
            )}
          >
            <Image src={image.src} alt="" fill sizes="64px" className="object-contain p-1" />
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
