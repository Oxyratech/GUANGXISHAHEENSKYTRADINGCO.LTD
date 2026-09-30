import type { ReactNode } from "react";
import { ImageSlot, type ImageSlotVariant } from "@/components/graphics/ImageSlot";
import type { GraphicTone } from "@/components/graphics/art-palette";
import { Check, ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";

/** Ticked list: things the buyer can prepare or tell us. */
export function CheckList({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={cn("grid gap-3", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-body text-ink">
          <Check aria-hidden className="mt-1.5 size-4 shrink-0 text-blue-700" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Plain list with a small gold marker: considerations and documents. */
export function MarkerList({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={cn("grid gap-3 text-body text-ink-muted", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-xs bg-gold-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Decorative panel for the hero of a page. It is aria-hidden and shown from lg only: on a phone it
 * would push the content down without adding information.
 */
export function HeroIllustration({
  variant,
  tone,
  alt,
}: {
  variant: ImageSlotVariant;
  tone: GraphicTone;
  alt: string;
}) {
  return (
    <div aria-hidden="true" className="hidden lg:block">
      <ImageSlot
        variant={variant}
        tone={tone}
        alt={alt}
        width={480}
        height={360}
        className="w-full"
      />
    </div>
  );
}

/**
 * A question that opens to its answer, built on the native <details> element: the answer is in the
 * server HTML (readable and indexable without JavaScript), the summary is the browser's own
 * keyboard-operable disclosure control, and `name` makes a group of them open one at a time.
 */
export function Disclosure({
  name,
  summary,
  children,
}: {
  name: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <details name={name} className="group/details border-b border-line first:border-t">
      <summary className="group/summary flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-start [&::-webkit-details-marker]:hidden">
        <h3 className="text-body-lg font-semibold text-navy-900 group-hover/summary:text-blue-700">
          {summary}
        </h3>
        <ChevronDown
          aria-hidden
          className="size-5 shrink-0 text-ink-subtle transition-transform duration-200 group-open/details:rotate-180"
        />
      </summary>
      <div className="pe-8 pb-6 text-body text-ink-muted">{children}</div>
    </details>
  );
}
