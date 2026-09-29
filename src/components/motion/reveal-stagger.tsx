"use client";

/*
 * RevealStagger: like Reveal, but for the direct children of a list or grid, revealed one after
 * another (60ms apart, at most 0.6s in total). It renders the container itself, so semantics are
 * untouched:  <RevealStagger as="ul" className="grid gap-6"><li>…</li><li>…</li></RevealStagger>.
 * Children present at mount are animated; children added later simply appear.
 */
import { useEffect, useRef, type ComponentProps, type ElementType } from "react";
import { armReveal } from "./reveal-effect";

const STAGGER_S = 0.06;

export function RevealStagger<T extends ElementType = "div">({
  as,
  ...props
}: { as?: T } & Omit<ComponentProps<T>, "as">) {
  const Tag: ElementType = as ?? "div";
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return undefined;
    const items = Array.from(container.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    return armReveal(container, items, { stagger: STAGGER_S });
  }, []);

  return <Tag ref={ref} {...props} />;
}
