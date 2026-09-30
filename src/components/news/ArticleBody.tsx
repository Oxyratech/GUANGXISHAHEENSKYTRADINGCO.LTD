/*
 * Renders an article's Markdown. The body is edited by staff, but it is still treated as untrusted:
 *  - No raw HTML: `skipHtml` drops it and `allowedElements` lists the only tags that can appear.
 *  - Links are an allow-list (classifyUrl): site paths, #anchors, mailto:, tel: and http(s). Anything
 *    else (javascript:, data:, ...) loses its link and keeps its words. External links open in a new
 *    tab, always with rel="noopener noreferrer", and say so to screen readers.
 *  - Images are drawn only from the media library, as /media/<id>, and only when the repository
 *    reported that id as a public image (`images`). Nothing is fetched from a third-party host: a
 *    remote https image would be blocked by the site's CSP and would leak the reader's address, so it
 *    is shown as a link to the image instead.
 *  - Headings move down one level (# becomes h2) because the page's h1 is the article title.
 * Only CommonMark is supported (no GFM tables or task lists).
 */
import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import { Prose } from "@/components/layout/prose";
import { SmartLink } from "@/components/ui/smart-link";
import { cn } from "@/lib/utils";
import { classifyUrl } from "./markdown-url";
import { mediaAssetIdFromPath, mediaPath } from "./media-path";

export interface BodyImage {
  width: number | null;
  height: number | null;
  /** Alt text from the media library, used when the Markdown gives none. */
  alt: string | null;
}

export interface ArticleBodyLabels {
  /** Announced after the text of a link that opens another site in a new tab. */
  opensInNewTab: string;
}

const ALLOWED_ELEMENTS = [
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "ul",
];

type HeadingTag = "h2" | "h3" | "h4" | "h5" | "h6";

/** react-markdown hands every component the hast `node`; it must not reach the DOM. */
function offsetHeading(Tag: HeadingTag) {
  return function Heading({ node: _node, ...props }: ComponentProps<"h2"> & ExtraProps) {
    return <Tag {...props} />;
  };
}

/** Code is left-to-right in every language; a wide block scrolls, so the keyboard must reach it. */
function CodeBlock({ node: _node, ...props }: ComponentProps<"pre"> & ExtraProps) {
  return <pre dir="ltr" tabIndex={0} {...props} />;
}

const STATIC_COMPONENTS = {
  h1: offsetHeading("h2"),
  h2: offsetHeading("h3"),
  h3: offsetHeading("h4"),
  h4: offsetHeading("h5"),
  h5: offsetHeading("h6"),
  h6: offsetHeading("h6"),
  pre: CodeBlock,
} satisfies Components;

const BODY_CLASSES = [
  "wrap-break-word",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-line [&_pre]:bg-surface [&_pre]:p-4 [&_pre]:text-start [&_pre]:text-small",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
];

const IMAGE_SIZES = "(min-width: 768px) 680px, 100vw";
/** Reserved box while an image of unknown size loads; the image itself scales by its own ratio. */
const FALLBACK_SIZE = { width: 1600, height: 900 } as const;

/** A link to an allowed address, or just its words when the address is not allowed. */
function renderLink(
  href: string | undefined,
  title: string | undefined,
  children: ReactNode,
  labels: ArticleBodyLabels,
): ReactNode {
  const kind = classifyUrl(href)?.kind;
  if (!href || !kind) return children;
  if (kind !== "external") {
    return (
      <SmartLink href={href} title={title}>
        {children}
      </SmartLink>
    );
  }
  return (
    <SmartLink href={href} title={title} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> ({labels.opensInNewTab})</span>
    </SmartLink>
  );
}

function createComponents(
  images: Readonly<Record<string, BodyImage>>,
  labels: ArticleBodyLabels,
): Components {
  return {
    ...STATIC_COMPONENTS,
    a: ({ node: _node, href, title, children }) => renderLink(href, title, children, labels),
    img: ({ node: _node, src, alt, title }) => {
      const source = typeof src === "string" ? src : "";
      const id = mediaAssetIdFromPath(source);
      const image = id ? images[id] : undefined;

      if (id && image) {
        return (
          <span className="my-6 block">
            <Image
              src={mediaPath(id)}
              alt={alt?.trim() || image.alt || ""}
              width={image.width ?? FALLBACK_SIZE.width}
              height={image.height ?? FALLBACK_SIZE.height}
              sizes={IMAGE_SIZES}
              className="h-auto w-full rounded-lg border border-line"
            />
            {title ? (
              <span className="mt-2 block text-caption text-ink-subtle">{title}</span>
            ) : null}
          </span>
        );
      }

      // Not a library image: a remote address becomes a link, anything else draws nothing.
      return classifyUrl(source)?.kind === "external"
        ? renderLink(source, title, alt?.trim() || source, labels)
        : null;
    },
  };
}

export function ArticleBody({
  markdown,
  images,
  labels,
  className,
}: {
  markdown: string;
  /** Public images the body may show, by lower-case asset id (see PublishedArticle.bodyImages). */
  images: Readonly<Record<string, BodyImage>>;
  labels: ArticleBodyLabels;
  className?: string;
}) {
  return (
    <Prose className={cn(BODY_CLASSES, className)}>
      <Markdown
        skipHtml
        allowedElements={ALLOWED_ELEMENTS}
        urlTransform={(url) => (classifyUrl(url) ? url : "")}
        components={createComponents(images, labels)}
      >
        {markdown}
      </Markdown>
    </Prose>
  );
}
