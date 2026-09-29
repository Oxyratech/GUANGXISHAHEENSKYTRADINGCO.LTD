/** Which background the logo sits on. `onLight` = white/surface, `onDark` = navy. */
export type LogoTone = "onLight" | "onDark";

export const LOGO_TONE_CLASSES: Record<
  LogoTone,
  { readonly mark: string; readonly accent: string; readonly name: string; readonly legal: string }
> = {
  onLight: {
    mark: "text-navy-900",
    accent: "fill-gold-500",
    name: "text-navy-900",
    legal: "text-ink-muted",
  },
  onDark: {
    mark: "text-white",
    accent: "fill-gold-400",
    name: "text-white",
    legal: "text-white/75",
  },
};
