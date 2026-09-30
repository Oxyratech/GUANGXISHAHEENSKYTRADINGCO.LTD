import { FileText, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MediaThumbnailProps {
  kind: string;
  visibility: string;
  id: string;
  fileName: string;
  className?: string;
}

/**
 * A media asset's preview. Only a PUBLIC image is safe to embed inline (it is the one case
 * `/media/[id]` will actually serve); everything else — a private image, or any document — shows a
 * plain icon instead of guessing at a URL the browser could not load anyway. Reusable by any admin
 * screen that lists media (product images, news covers, ...).
 */
export function MediaThumbnail({ kind, visibility, id, fileName, className }: MediaThumbnailProps) {
  if (kind === "IMAGE" && visibility === "PUBLIC") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a database-backed asset, not a build-time image.
      <img
        src={`/media/${id}`}
        alt={`Preview of ${fileName}`}
        loading="lazy"
        className={cn("size-full object-cover", className)}
      />
    );
  }

  const Icon = kind === "IMAGE" ? ImageOff : FileText;
  return (
    <div
      role="img"
      aria-label={
        kind === "IMAGE" ? `Private image, no preview: ${fileName}` : `Document: ${fileName}`
      }
      className={cn(
        "grid size-full place-items-center bg-surface text-ink-subtle [&_svg]:size-6",
        className,
      )}
    >
      <Icon aria-hidden />
    </div>
  );
}
