"use client";

/*
 * Radix accordion, used for the FAQ. Each trigger sits inside a heading (default h3; set
 * headingLevel to fit the page outline). Enter/Space toggle, Up/Down/Home/End move between
 * triggers. The chevron sits at the inline end and needs no mirroring.
 *
 *   <Accordion type="single" collapsible>
 *     <AccordionItem value="q1"><AccordionTrigger>Question</AccordionTrigger>
 *       <AccordionContent>Answer</AccordionContent></AccordionItem>
 *   </Accordion>
 */
import { ChevronDown } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useUiDirection } from "./direction";
import "./ui-motion.css";

export function Accordion(props: ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root dir={useUiDirection()} {...props} />;
}

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cn("border-b border-line first:border-t", className)}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  headingLevel = 3,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger> & { headingLevel?: 2 | 3 | 4 | 5 | 6 }) {
  const Heading = `h${headingLevel}` as const;
  return (
    <AccordionPrimitive.Header asChild>
      <Heading className="m-0 flex">
        <AccordionPrimitive.Trigger
          className={cn(
            "group flex min-h-14 flex-1 items-center justify-between gap-4 py-4 text-start text-body-lg font-semibold text-navy-900 transition-colors duration-150 hover:text-blue-700",
            className,
          )}
          {...props}
        >
          {children}
          <ChevronDown
            aria-hidden
            className="size-5 shrink-0 text-ink-subtle transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </AccordionPrimitive.Trigger>
      </Heading>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content className="ui-collapse text-body text-ink-muted" {...props}>
      <div className={cn("pe-8 pb-6", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
