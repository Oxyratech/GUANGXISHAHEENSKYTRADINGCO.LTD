export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Shape of the generated `world-dots.ts` (see scripts/generate-world-map.ts).
 *
 * Dots sit on a staggered grid: cell (col, row) is centred at
 * x = (col + 0.5 + (row odd ? 0.5 : 0)) * pitch, y = (row + 0.5) * rowStep.
 */
export interface WorldDotsData {
  /** viewBox size in user units. */
  readonly width: number;
  readonly height: number;
  readonly cols: number;
  readonly rows: number;
  /** Horizontal distance between neighbouring dots. */
  readonly pitch: number;
  readonly rowStep: number;
  /** One entry per row: "ocean,land,ocean,land,..." cell counts (trailing ocean implied). */
  readonly runs: readonly string[];
  /** Projected position of Nanning (COMPANY.nanningLatLng). */
  readonly nanning: WorldPoint;
  /** Unlabelled, purely decorative fan-out targets, snapped to land dots. */
  readonly routeEndpoints: readonly WorldPoint[];
}
