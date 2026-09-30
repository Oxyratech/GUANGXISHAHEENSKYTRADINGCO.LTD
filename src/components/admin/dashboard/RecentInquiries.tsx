import { AdminLink } from "@/components/admin/AdminLink";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { RecentInquiry } from "@/server/admin/dashboard/queries";
import { formatCountryCode } from "@/server/admin/format";

const COLUMNS: DataTableColumn<RecentInquiry>[] = [
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
  { key: "company", header: "Company", cell: (row) => row.company },
  { key: "country", header: "Country", cell: (row) => formatCountryCode(row.country) },
  { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  {
    key: "received",
    header: "Received",
    cell: (row) => <LocalDateTime value={row.createdAt} className="whitespace-nowrap" />,
  },
];

/** The newest inquiries, straight from the database. With none, it says so. */
export function RecentInquiries({ rows }: { rows: readonly RecentInquiry[] }) {
  return (
    <DataTable
      caption="Most recent inquiries"
      // The section heading above already labels the table; the caption stays for assistive tech.
      hideCaption
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      emptyState={
        <EmptyState
          titleAs="p"
          title="No inquiries have been received yet."
          description="Inquiries sent through the public form will appear here."
          className="py-10"
        />
      }
    />
  );
}
