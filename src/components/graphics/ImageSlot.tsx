/**
 * ImageSlot — the single place where imagery appears on the site.
 *
 * Today the company has no photography of its own, so a slot shows a restrained vector panel
 * (one of the abstract illustrations) that is labelled for assistive technology and contains no
 * text. We never fill a slot with stock photography that implies facilities, staff, clients or
 * shipments the company does not have.
 *
 * HOW TO SWAP IN REAL COMPANY PHOTOGRAPHY
 *   1. Add the photo to the media library (or `public/`, or import it statically).
 *   2. Pass it as `src` to the same slot, changing nothing else:
 *        <ImageSlot src="/media/<id>" alt="What the photo actually shows" width={1600} height={1000}
 *                   sizes="(min-width: 1024px) 50vw, 100vw" />
 *      or, inside a sized parent, `fill` with `sizes` instead of `width`/`height`.
 *   3. Write `alt` for the photo itself. Use `priority` only for the one above-the-fold image.
 * The vector panel disappears by itself; no other component or layout needs to change.
 */
import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";
import type { GraphicTone } from "./art-palette";
import { DocumentArt } from "./DocumentArt";
import { PatternGrid } from "./PatternGrid";
import { ShipmentArt } from "./ShipmentArt";
import { SourcingArt } from "./SourcingArt";

export type ImageSlotVariant = "sourcing" | "shipment" | "documents";

interface CommonProps {
  /** Describes the photograph when `src` is set and labels the vector panel otherwise. Required. */
  alt: string;
  /** Real photography. Leave out until it exists. */
  src?: string | StaticImageData;
  /** Which illustration fills the slot while there is no photo. */
  variant?: ImageSlotVariant;
  /** Panel background of the vector fallback. */
  tone?: GraphicTone;
  /** Above-the-fold image: preloaded and never lazy (Next 16 `preload`). Ignored without `src`. */
  priority?: boolean;
  className?: string;
}

/** Intrinsic size: the slot reserves a `width / height` box and scales to its container. */
interface IntrinsicSize {
  fill?: false;
  width: number;
  height: number;
  sizes?: string;
}

/** Parent-sized: the slot fills a positioned parent that already has a height. */
interface FillSize {
  fill: true;
  sizes: string;
  width?: never;
  height?: never;
}

export type ImageSlotProps = CommonProps & (IntrinsicSize | FillSize);

const PANEL: Record<GraphicTone, string> = {
  navy: "bg-linear-to-br from-navy-800 to-navy-950",
  light: "border border-line bg-surface",
};

function Illustration({ variant, tone }: { variant: ImageSlotVariant; tone: GraphicTone }) {
  const className = "h-full w-full";
  switch (variant) {
    case "sourcing":
      return <SourcingArt tone={tone} className={className} />;
    case "documents":
      return <DocumentArt tone={tone} className={className} />;
    case "shipment":
      return <ShipmentArt tone={tone} className={className} />;
  }
}

export function ImageSlot(props: ImageSlotProps) {
  const { alt, src, variant = "shipment", tone = "navy", priority = false, className } = props;
  const aspect = props.fill ? undefined : { aspectRatio: `${props.width} / ${props.height}` };

  if (src) {
    return (
      <div className={cn("relative overflow-hidden rounded-lg", className)} style={aspect}>
        {props.fill ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={props.sizes}
            preload={priority}
            className="object-cover"
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={props.width}
            height={props.height}
            sizes={props.sizes}
            preload={priority}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("relative isolate overflow-hidden rounded-lg", PANEL[tone], className)}
      style={aspect}
    >
      <PatternGrid tone={tone} variant="dots" className="opacity-70" />
      <div className="absolute inset-0 flex items-center justify-center p-[6%]">
        <Illustration variant={variant} tone={tone} />
      </div>
    </div>
  );
}
