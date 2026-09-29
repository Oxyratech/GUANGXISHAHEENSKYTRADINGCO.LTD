/** Background the graphic is drawn on. */
export type GraphicTone = "light" | "navy";

/**
 * Colour roles for every vector graphic, expressed only through design tokens (Tailwind utilities
 * and CSS variables from globals.css). Class names are written out in full so Tailwind can see them.
 */
interface Palette {
  /** Structural strokes. */
  line: string;
  lineSoft: string;
  /** Solid surfaces (containers, sheets, nodes). */
  surface: string;
  tint: string;
  tintStrong: string;
  deep: string;
  /** Gold is the single accent: use it sparingly. */
  accentStroke: string;
  accentFill: string;
  accentHalo: string;
  /** Repeating backgrounds. */
  pattern: string;
  /** World map. */
  dot: string;
  graticule: string;
  /** Route gradient (CSS variable references, applied through `stop-color`). */
  routeFrom: string;
  routeTo: string;
}

export const PALETTE: Record<GraphicTone, Palette> = {
  navy: {
    line: "stroke-blue-300/55",
    lineSoft: "stroke-blue-300/22",
    surface: "fill-navy-800",
    tint: "fill-blue-300/12",
    tintStrong: "fill-blue-400/45",
    deep: "fill-navy-600",
    accentStroke: "stroke-gold-400",
    accentFill: "fill-gold-400",
    accentHalo: "fill-gold-400/12",
    pattern: "stroke-blue-300/30",
    dot: "stroke-blue-300/45",
    graticule: "stroke-blue-300/12",
    routeFrom: "var(--color-gold-400)",
    routeTo: "var(--color-gold-300)",
  },
  light: {
    line: "stroke-navy-700/40",
    lineSoft: "stroke-navy-700/15",
    surface: "fill-white",
    tint: "fill-blue-600/8",
    tintStrong: "fill-blue-500/30",
    deep: "fill-navy-700",
    accentStroke: "stroke-gold-500",
    accentFill: "fill-gold-500",
    accentHalo: "fill-gold-500/14",
    pattern: "stroke-navy-700/20",
    dot: "stroke-navy-800/28",
    graticule: "stroke-navy-800/8",
    routeFrom: "var(--color-gold-500)",
    routeTo: "var(--color-gold-400)",
  },
};
