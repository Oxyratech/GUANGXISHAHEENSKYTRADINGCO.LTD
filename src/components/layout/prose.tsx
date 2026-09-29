import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Long-form typography for legal text, articles and rendered Markdown (react-markdown output).
 * Styles plain elements (h2-h4, p, lists, blockquote, tables, code, hr, links) so content needs no
 * classes. About 68ch measure; lists and quotes use logical inline-start spacing, so they are
 * correct in RTL. The page's h1 belongs to PageHero: content headings start at h2.
 */
const PROSE = [
  "max-w-[68ch] text-body text-ink",
  "[&>*+*]:mt-5 [&>:first-child]:mt-0",
  "[&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-h3 [&_h2]:text-navy-900",
  "[&_h3]:mt-8 [&_h3]:scroll-mt-24 [&_h3]:text-body-lg [&_h3]:font-semibold [&_h3]:text-navy-900",
  "[&_h4]:mt-6 [&_h4]:font-semibold [&_h4]:text-navy-900",
  "[&_a]:text-blue-600 [&_a]:underline [&_a]:decoration-blue-300 [&_a]:underline-offset-4 [&_a:hover]:decoration-blue-600",
  "[&_strong]:font-semibold [&_strong]:text-navy-900",
  "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-6 [&_ol]:ps-6 [&_li]:ps-1 [&_li+li]:mt-2 [&_li]:marker:text-ink-subtle",
  "[&_blockquote]:border-s-2 [&_blockquote]:border-gold-400 [&_blockquote]:ps-5 [&_blockquote]:text-ink-muted",
  "[&_hr]:my-10 [&_hr]:border-line",
  "[&_code]:rounded-xs [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em]",
  "[&_table]:w-full [&_table]:text-small [&_th]:text-start [&_th]:font-semibold [&_th]:text-navy-900",
  "[&_td]:border-b [&_td]:border-line [&_td]:py-2.5 [&_td]:pe-4 [&_th]:border-b [&_th]:border-line-strong [&_th]:py-2.5 [&_th]:pe-4",
];

export function Prose({
  as: Tag = "div",
  className,
  ...props
}: ComponentProps<"div"> & { as?: "div" | "article" | "section" }) {
  return <Tag className={cn(PROSE, className)} {...props} />;
}
