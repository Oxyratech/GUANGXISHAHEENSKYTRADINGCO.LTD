import { BRAND_COLORS, MARK_HORIZON, MARK_VIEWBOX, MARK_WING_PATH } from "./brand-geometry";

/**
 * The mark with explicit colours and pixel size, for `ImageResponse` (Apple icon, Open Graph card).
 * Satori has no CSS cascade, so the class-based <LogoMark> cannot be used there.
 */
export function LogoMarkImage({
  size,
  wing = BRAND_COLORS.white,
  accent = BRAND_COLORS.gold,
}: {
  size: number;
  wing?: string;
  accent?: string;
}) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}>
      <path d={MARK_WING_PATH} fill={wing} />
      <rect {...MARK_HORIZON} fill={accent} />
    </svg>
  );
}
