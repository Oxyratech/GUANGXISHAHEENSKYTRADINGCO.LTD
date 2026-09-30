import Markdown, { type Components } from "react-markdown";
import { Prose } from "@/components/layout/prose";
import { SmartLink } from "@/components/ui/smart-link";
import type { Locale } from "@/i18n/locales";
import { contentLanguageProps } from "./content-language";

/*
 * Product text is written by editors as plain paragraphs or Markdown. It is rendered without any
 * raw HTML (skipHtml), from an allow-list of elements, with unsafe URL schemes removed by
 * react-markdown's default transform. Images are not allowed: product images belong to the gallery.
 * The page's h1 is the product name and its sections use h2, so Markdown headings start at h3.
 */
const ALLOWED_ELEMENTS = [
  "p",
  "br",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "code",
  "pre",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
];

const components: Components = {
  h1: "h3",
  h2: "h3",
  h4: "h4",
  h5: "h4",
  h6: "h4",
  a: ({ href, children }) =>
    href ? <SmartLink href={href}>{children}</SmartLink> : <>{children}</>,
};

/** Product description, applications or packaging text, typeset as long-form content. */
export function ProductRichText({
  text,
  contentLocale,
  locale,
  className,
}: {
  text: string;
  /** Language the text is written in (differs from `locale` when it fell back to English). */
  contentLocale: Locale;
  locale: Locale;
  className?: string;
}) {
  return (
    <Prose className={className} {...contentLanguageProps(contentLocale, locale)}>
      <Markdown
        skipHtml
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        components={components}
      >
        {text}
      </Markdown>
    </Prose>
  );
}
