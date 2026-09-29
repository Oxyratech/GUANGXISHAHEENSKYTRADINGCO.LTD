/*
 * Card family. A card that is one big link is built the accessible way: <Card interactive> plus a
 * <CardLink> inside the title. The link's ::after stretches over the card, so the whole surface is
 * clickable while keyboard and screen-reader users get exactly one link named by the title (no
 * nested interactive elements, no duplicate tab stops). Anything else clickable in the card must
 * sit above the overlay with `relative z-10`.
 *
 *   <Card interactive>
 *     <CardHeader><CardTitle><CardLink href="/business/import-export">Import & export</CardLink></CardTitle>
 *       <CardDescription>…</CardDescription></CardHeader>
 *   </Card>
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { SmartLink, type SmartLinkProps } from "./smart-link";

export function Card({
  as,
  className,
  interactive = false,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean; as?: "div" | "article" | "li" | "section" }) {
  // article/li/section accept every prop a div does; the cast only keeps the ref type consistent.
  const Tag = (as ?? "div") as "div";
  return (
    <Tag
      className={cn(
        "relative flex flex-col rounded-lg border border-line bg-white text-ink shadow-card",
        interactive &&
          "transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-raised has-[a:focus-visible]:border-blue-500 has-[a:focus-visible]:shadow-raised",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2 p-6", className)} {...props} />;
}

export function CardTitle({
  className,
  as: Tag = "h3",
  ...props
}: ComponentProps<"h3"> & { as?: "h2" | "h3" | "h4" | "p" }) {
  return <Tag className={cn("text-h3 text-navy-900", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-small text-ink-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex-1 px-6 pb-6 first:pt-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-3 border-t border-line px-6 py-4", className)}
      {...props}
    />
  );
}

/** The single link of an interactive card. Place inside CardTitle. */
export function CardLink({ className, ...props }: SmartLinkProps) {
  return (
    <SmartLink
      className={cn(
        "after:absolute after:inset-0 after:rounded-lg after:content-['']",
        "hover:text-blue-700",
        className,
      )}
      {...props}
    />
  );
}
