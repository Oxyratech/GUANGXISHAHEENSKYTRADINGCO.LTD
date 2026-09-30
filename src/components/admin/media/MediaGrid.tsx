import { Card, CardLink } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MediaLibraryRow } from "@/server/admin/media";
import { formatBytes } from "@/server/admin/format";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { MediaThumbnail } from "./MediaThumbnail";
import { MediaUsageBadges } from "./MediaUsageBadges";

/** The image half of the library: a responsive grid of cards, each opening the asset's detail page. */
export function MediaGrid({ rows }: { rows: readonly MediaLibraryRow[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {rows.map((row) => (
        <Card key={row.id} as="li" interactive className="overflow-hidden">
          <div className="aspect-square w-full overflow-hidden border-b border-line bg-surface">
            <MediaThumbnail
              id={row.id}
              kind={row.kind}
              visibility={row.visibility}
              fileName={row.fileName}
            />
          </div>
          <div className="grid gap-1.5 p-3">
            <p className="min-w-0 truncate text-small font-medium text-navy-900">
              <CardLink href={`/admin/media/${row.id}`}>{row.fileName}</CardLink>
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-caption text-ink-muted">
              <Badge variant={row.visibility === "PUBLIC" ? "success" : "neutral"}>
                {row.visibility === "PUBLIC" ? "Public" : "Private"}
              </Badge>
              <span>{formatBytes(row.sizeBytes)}</span>
              {row.width && row.height ? (
                <span>
                  {row.width}&times;{row.height}
                </span>
              ) : null}
            </div>
            <p className="text-caption text-ink-subtle">
              <LocalDateTime value={row.createdAt} dateOnly />
            </p>
            <MediaUsageBadges usage={row.usage} className="relative z-10 [&_span]:text-caption" />
          </div>
        </Card>
      ))}
    </ul>
  );
}
