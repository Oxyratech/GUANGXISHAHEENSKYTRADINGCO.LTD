"use client";

/*
 * FadeIn: page-transition wrapper for app/(site)/[locale]/template.tsx. A template remounts on every
 * navigation, so its content fades in over 180ms (opacity only, no movement). The first mount of a
 * page load is skipped: server HTML is already on screen, and fading it would flash and hurt LCP.
 * Reduced motion => no animation.
 */
import { animate } from "motion/react";
import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { prefersReducedMotion } from "./reduced-motion";

const DURATION_S = 0.18;

/** Set by the first FadeIn that mounts in this page load (client only: effects never run on the server). */
let hasMountedBefore = false;

export function FadeIn(props: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  // Decided once per instance so React Strict Mode's second effect run does not change the answer.
  const isInitialLoad = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (isInitialLoad.current === null) {
      isInitialLoad.current = !hasMountedBefore;
      hasMountedBefore = true;
    }
    if (isInitialLoad.current || prefersReducedMotion()) return undefined;

    // Layout effect: hide before the browser paints the new page, then fade it in.
    element.style.opacity = "0";
    const animation = animate(
      element,
      { opacity: [0, 1] },
      {
        duration: DURATION_S,
        ease: "easeOut",
        onComplete: () => element.style.removeProperty("opacity"),
      },
    );
    return () => {
      animation.stop();
      element.style.removeProperty("opacity");
    };
  }, []);

  return <div ref={ref} {...props} />;
}
