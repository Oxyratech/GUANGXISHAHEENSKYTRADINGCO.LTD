import { BRAND_COLORS } from "@/components/brand/brand-geometry";
import { LogoMarkImage } from "@/components/brand/LogoMarkImage";
import { COMPANY } from "@/config/company";
import { OG_IMAGE_SIZE, OG_TAGLINE } from "./constants";

/** blue-200 from the design tokens: the quiet secondary text colour on navy. */
const MUTED = "#b9d1f1";

/**
 * The default 1200x630 social card for `ImageResponse`: navy field, the mark, the wordmark and the
 * tagline. Typographic and vector only, no imagery. Latin text only: see opengraph-image.tsx.
 * Satori has no CSS cascade, so every style is inline and every multi-child box is a flex container.
 */
export function OgCard() {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: OG_IMAGE_SIZE.width,
        height: OG_IMAGE_SIZE.height,
        padding: "72px 84px",
        background: BRAND_COLORS.navy,
        color: BRAND_COLORS.white,
      }}
    >
      {/* Oversized, low-contrast wing as a backdrop (no horizon: it would read as a stray bar). */}
      <div
        style={{ position: "absolute", display: "flex", right: -110, bottom: -30, opacity: 0.06 }}
      >
        <LogoMarkImage size={600} accent="transparent" />
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <LogoMarkImage size={96} />
        <div
          style={{
            display: "flex",
            marginLeft: 24,
            fontSize: 44,
            letterSpacing: "0.16em",
            lineHeight: 1,
          }}
        >
          {COMPANY.brandName}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            width: 72,
            height: 5,
            marginBottom: 36,
            background: BRAND_COLORS.gold,
          }}
        />
        <div
          style={{
            display: "flex",
            maxWidth: 880,
            fontSize: 76,
            lineHeight: 1.12,
            letterSpacing: -1,
          }}
        >
          {OG_TAGLINE}
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 26, letterSpacing: "0.08em", color: MUTED }}>
        {COMPANY.legalNameEn}
      </div>
    </div>
  );
}
