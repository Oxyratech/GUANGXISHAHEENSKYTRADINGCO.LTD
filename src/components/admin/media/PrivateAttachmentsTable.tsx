import { AdminLink } from "@/components/admin/AdminLink";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatBytes } from "@/server/admin/format";
import type { PrivateAttachmentRow } from "@/server/admin/media";

/**
 * Read-only: buyer attachments are never edited or deleted from here, only looked up. Each row links
 * to the inquiry that owns the file; the file itself opens through the authorised `/files/[id]` route.
 */
export function PrivateAttachmentsTable({ rows }: { rows: readonly PrivateAttachmentRow[] }) {
  const columns: DataTableColumn<PrivateAttachmentRow>[] = [
    {
      key: "fileName",
      header: "File",
      rowHeader: true,
      cell: (row) => (
        <a
          href={`/files/${row.asset.id}`}
          className="rounded-xs text-blue-700 underline-offset-4 hover:underline"
        >
          {row.asset.fileName}
        </a>
      ),
    },
    { key: "size", header: "Size", cell: (row) => formatBytes(row.asset.sizeBytes) },
    {
      key: "inquiry",
      header: "Inquiry",
      cell: (row) => (
        <span className="grid gap-0.5">
          <AdminLink href={`/admin/inquiries/${row.inquiry.id}`}>
            {row.inquiry.referenceCode}
          </AdminLink>
          <span className="text-caption text-ink-muted">{row.inquiry.company}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Inquiry status",
      cell: (row) => <StatusBadge status={row.inquiry.status} />,
    },
    {
      key: "createdAt",
      header: "Uploaded",
      cell: (row) => <LocalDateTime value={row.createdAt} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      caption="Private inquiry attachments"
    />
  );
}
