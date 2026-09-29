import { ImageResponse } from "next/og";
import { BRAND_COLORS } from "@/components/brand/brand-geometry";
import { LogoMarkImage } from "@/components/brand/LogoMarkImage";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS masks and rounds the icon itself, so the navy tile is full-bleed and opaque. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_COLORS.navy,
      }}
    >
      <LogoMarkImage size={148} />
    </div>,
    { ...size },
  );
}
