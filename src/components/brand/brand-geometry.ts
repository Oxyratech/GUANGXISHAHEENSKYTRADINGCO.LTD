import { SITE } from "@/config/site";

/**
 * Geometry of the Shaheen Sky mark, shared by every place that has to draw it without CSS: the
 * <LogoMark> component, the generated Apple icon and the Open Graph card. src/app/icon.svg and
 * public/brand/logo-mark.svg are static files and repeat these numbers (brand-geometry.test.ts
 * fails if they drift).
 *
 * The mark is original: a swept wing (Shaheen means falcon) whose three primary feathers rise over a
 * gold horizon line (Sky). It is built from straight segments only and borrows nothing from any
 * national emblem or seal, including the state emblem printed on the business licence.
 */
export const MARK_VIEWBOX = 48;

export const MARK_WING_PATH =
  "M4 22 L11 16.5 L21 11.5 L33.5 7 L44 5.5 L30.5 16.5 L42 13.5 L29 24 L38.5 21.5 L12 35.5 Z";

export const MARK_HORIZON = { x: 4, y: 40, width: 40, height: 3 } as const;

/** Raw colours for contexts without CSS variables (the tokens in globals.css are the source). */
export const BRAND_COLORS = {
  navy: SITE.themeColor,
  gold: "#c4a457",
  white: "#ffffff",
} as const;
