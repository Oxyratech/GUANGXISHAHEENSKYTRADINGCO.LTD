import { AdminLink } from "@/components/admin/AdminLink";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCountryCode } from "@/server/admin/format";
import type { ContactListRow } from "@/server/admin/contact-messages/list";

const COLUMNS: DataTableColumn<ContactListRow>[] = [
  {
    key: "reference",
    header: "Reference",
    rowHeader: true,
    cell: (row) => (
      <AdminLink href={`/admin/contact-messages/${row.id}`} className="font-mono">
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
    key: "name",
    header: "Name / company",
    cell: (row) => (
      <div className="grid gap-0.5">
        <span className="text-ink">{row.name}</span>
        {row.company ? <span className="text-caption text-ink-muted">{row.company}</span> : null}
      </div>
    ),
  },
  { key: "country", header: "Country", cell: (row) => formatCountryCode(row.country) },
  { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  { key: "handledBy", header: "Handled by", cell: (row) => row.handledBy?.name ?? null },
];

/** The contact messages table, with an empty state that tells "none yet" apart from "none match". */
export function ContactTable({
  rows,
  hasActiveFilters,
}: {
  rows: readonly ContactListRow[];
  hasActiveFilters: boolean;
}) {
  return (
    <DataTable
      caption="Contact messages"
      hideCaption
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      emptyState={
        hasActiveFilters ? (
          <EmptyState
            titleAs="p"
            title="No messages match these filters."
            description="Try a different search, or reset the filters to see every message."
            className="py-10"
          />
        ) : (
          <EmptyState
            titleAs="p"
            title="No contact messages have been received yet."
            description="Messages sent through the public contact form will appear here."
            className="py-10"
          />
        )
      }
    />
  );
}
