"use client";

/*
 * Reveal: fades in and rises 12px, once, when scrolled into view. Content is visible without JS and
 * with prefers-reduced-motion (see reveal-effect.ts). Use it for below-the-fold blocks only; never
 * wrap above-the-fold or LCP content. `delay` is in seconds.
 */
import { useEffect, useRef, type ComponentProps, type ElementType } from "react";
import { armReveal } from "./reveal-effect";

export function Reveal<T extends ElementType = "div">({
  as,
  delay = 0,
  ...props
}: { as?: T; delay?: number } & Omit<ComponentProps<T>, "as" | "delay">) {
  const Tag: ElementType = as ?? "div";
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    return element ? armReveal(element, [element], { delay }) : undefined;
  }, [delay]);

  return <Tag ref={ref} {...props} />;
}
