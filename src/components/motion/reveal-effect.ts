import { animate, inView } from "motion/react";
import { prefersReducedMotion } from "./reduced-motion";

const DISTANCE_PX = 12;
const DURATION_S = 0.5;
const EASE = [0.22, 1, 0.36, 1] as const;
/** A staggered group never takes longer than this in total, however many items it has. */
const MAX_STAGGER_TOTAL_S = 0.6;

interface RevealOptions {
  /** Seconds before the first target starts. */
  delay?: number;
  /** Seconds between consecutive targets. */
  stagger?: number;
}

const noop = () => {};

function showNow(target: HTMLElement) {
  target.style.removeProperty("opacity");
  target.style.removeProperty("transform");
}

/**
 * Scroll reveal, built so content is never lost:
 *  - Server HTML and pre-hydration are fully visible (nothing is hidden by CSS or markup).
 *  - Only targets that start *below* the viewport are hidden, and only after mount; anything on
 *    screen, or already scrolled past, is left alone (no flash, no layout shift, LCP-safe).
 *  - Nothing is hidden with reduced motion, without IntersectionObserver, or when printing.
 * Each target fades in and rises 12px once, when `trigger` enters the viewport. Returns a cleanup
 * that restores visibility.
 */
export function armReveal(
  trigger: Element,
  targets: readonly HTMLElement[],
  { delay = 0, stagger = 0 }: RevealOptions = {},
): () => void {
  if (
    targets.length === 0 ||
    prefersReducedMotion() ||
    typeof IntersectionObserver === "undefined"
  ) {
    return noop;
  }
  if (trigger.getBoundingClientRect().top < window.innerHeight) return noop;

  for (const target of targets) {
    target.style.opacity = "0";
    target.style.transform = `translateY(${DISTANCE_PX}px)`;
  }

  const step = Math.min(stagger, MAX_STAGGER_TOTAL_S / targets.length);
  const running: { stop: () => void }[] = [];

  const stopObserving = inView(
    trigger,
    () => {
      targets.forEach((target, index) => {
        running.push(
          animate(
            target,
            { opacity: [0, 1], y: [DISTANCE_PX, 0] },
            {
              duration: DURATION_S,
              delay: delay + index * step,
              ease: EASE,
              onComplete: () => showNow(target),
            },
          ),
        );
      });
    },
    { margin: "0px 0px -10% 0px" },
  );

  const revealAll = () => {
    stopObserving();
    running.forEach((animation) => animation.stop());
    targets.forEach(showNow);
  };
  window.addEventListener("beforeprint", revealAll);

  return () => {
    window.removeEventListener("beforeprint", revealAll);
    revealAll();
  };
}
