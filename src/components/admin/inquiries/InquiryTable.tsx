import { Paperclip } from "lucide-react";
import { AdminLink } from "@/components/admin/AdminLink";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCountryCode, humanizeCode } from "@/server/admin/format";
import type { InquiryListRow } from "@/server/admin/inquiries/list";

const COLUMNS: DataTableColumn<InquiryListRow>[] = [
  {
    key: "reference",
    header: "Reference",
    rowHeader: true,
    cell: (row) => (
      <AdminLink href={`/admin/inquiries/${row.id}`} className="font-mono">
        {row.referenceCode}
      </AdminLink>
    ),
  },
  {
    key: "received",
    header: "Received",
    cell: (row) => <LocalDateTime value={row.createdAt} className="whitespace-nowrap" />,
  },
  {
    key: "company",
    header: "Company / name",
    cell: (row) => (
      <div className="grid gap-0.5">
        <span className="text-ink">{row.company}</span>
        <span className="text-caption text-ink-muted">{row.name}</span>
      </div>
    ),
  },
  { key: "country", header: "Country", cell: (row) => formatCountryCode(row.country) },
  {
    key: "product",
    header: "Product",
    cell: (row) => <span className="line-clamp-2 max-w-64">{row.productName}</span>,
  },
  {
    key: "category",
    header: "Category",
    cell: (row) => (row.categorySlug ? humanizeCode(row.categorySlug) : null),
  },
  { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  {
    key: "assignee",
    header: "Assignee",
    cell: (row) => row.assignedTo?.name ?? null,
  },
  {
    key: "attachments",
    header: "Files",
    align: "center",
    cell: (row) =>
      row.attachmentCount > 0 ? (
        <span
          className="inline-flex items-center gap-1 text-ink-muted"
          title={`${row.attachmentCount} attachment${row.attachmentCount === 1 ? "" : "s"}`}
        >
          <Paperclip aria-hidden className="size-4" />
          <span className="sr-only">{row.attachmentCount} attachments</span>
          <span aria-hidden className="text-caption tabular-nums">
            {row.attachmentCount}
          </span>
        </span>
      ) : null,
  },
];

/**
 * The inquiries table. `emptyState` tells apart "nothing has ever come in" from "these filters match
 * nothing" so the reader knows whether to widen the search or just wait.
 */
export function InquiryTable({
  rows,
  hasActiveFilters,
}: {
  rows: readonly InquiryListRow[];
  hasActiveFilters: boolean;
}) {
  return (
    <DataTable
      caption="Business inquiries"
      hideCaption
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      emptyState={
        hasActiveFilters ? (
          <EmptyState
            titleAs="p"
            title="No inquiries match these filters."
            description="Try a different search, or reset the filters to see every inquiry."
            className="py-10"
          />
        ) : (
          <EmptyState
            titleAs="p"
            title="No inquiries have been received yet."
            description="Inquiries sent through the public form will appear here."
            className="py-10"
          />
        )
      }
    />
  );
}
