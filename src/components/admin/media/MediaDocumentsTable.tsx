import { AdminLink } from "@/components/admin/AdminLink";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EMPTY_VALUE, formatBytes } from "@/server/admin/format";
import type { MediaLibraryRow } from "@/server/admin/media";
import { MediaUsageBadges } from "./MediaUsageBadges";

/** The document half of the library: a table (a grid of thumbnails would not help for a PDF). */
export function MediaDocumentsTable({ rows }: { rows: readonly MediaLibraryRow[] }) {
  const columns: DataTableColumn<MediaLibraryRow>[] = [
    {
      key: "fileName",
      header: "File name",
      rowHeader: true,
      cell: (row) => <AdminLink href={`/admin/media/${row.id}`}>{row.fileName}</AdminLink>,
    },
    { key: "mimeType", header: "Type", cell: (row) => row.mimeType },
    { key: "sizeBytes", header: "Size", cell: (row) => formatBytes(row.sizeBytes) },
    {
      key: "visibility",
      header: "Visibility",
      cell: (row) => (
        <Badge variant={row.visibility === "PUBLIC" ? "success" : "neutral"}>
          {row.visibility === "PUBLIC" ? "Public" : "Private"}
        </Badge>
      ),
    },
    {
      key: "uploaded",
      header: "Uploaded by / when",
      cell: (row) => (
        <span className="grid gap-0.5">
          <span>{row.uploadedBy?.name ?? EMPTY_VALUE}</span>
          <LocalDateTime value={row.createdAt} className="text-caption text-ink-muted" />
        </span>
      ),
    },
    {
      key: "usage",
      header: "Used by",
      cell: (row) => <MediaUsageBadges usage={row.usage} />,
    },
  ];

  return (
    <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} caption="Documents" />
  );
}
