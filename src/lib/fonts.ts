import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";

/**
 * Latin: IBM Plex Sans. Arabic: IBM Plex Sans Arabic (same design family, so mixed-script lines
 * stay coherent). Chinese uses the platform CJK stack (see --font-cjk-stack): shipping a CJK
 * webfont would cost megabytes for no visual gain on the devices that read it.
 */
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
  preload: false,
});
