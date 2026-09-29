import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/fade-in";

/** A template remounts on every navigation, which gives each page a short fade-in. */
export default function LocaleTemplate({ children }: { children: ReactNode }) {
  return <FadeIn>{children}</FadeIn>;
}
