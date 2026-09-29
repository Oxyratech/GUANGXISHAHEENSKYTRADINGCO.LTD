import { cn } from "@/lib/utils";
import type { GraphicTone } from "./art-palette";
import { WorldMapLayers } from "./WorldMapLayers";
import { WORLD_VIEWBOX } from "./world-geometry";

export interface WorldMapProps {
  /** `light` for white/surface backgrounds, `navy` for dark navy sections. */
  tone?: GraphicTone;
  /** Ring Nanning, the registered location (COMPANY.nanningLatLng). Best at 480px wide or more. */
  highlightNanning?: boolean;
  /**
   * Draw faint arcs from Nanning to a handful of unlabelled points around the globe.
   * ILLUSTRATIVE ONLY: the endpoints are arbitrary and do not represent markets, offices or clients.
   */
  showRoutes?: boolean;
  className?: string;
}

/**
 * Decorative dotted world map: one SVG, one dot path, no labels. Hidden from assistive technology;
 * put any meaningful information in real text next to it. Never label countries or cities here, and
 * never let it imply served markets. Sizes itself to its container width (`h-auto w-full`).
 */
export function WorldMap({
  tone = "light",
  highlightNanning = false,
  showRoutes = false,
  className,
}: WorldMapProps) {
  return (
    <svg
      viewBox={WORLD_VIEWBOX}
      aria-hidden="true"
      className={cn("block h-auto w-full", className)}
    >
      <WorldMapLayers tone={tone} highlightNanning={highlightNanning} showRoutes={showRoutes} />
    </svg>
  );
}
