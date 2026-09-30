import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { RecentAuditEntry } from "@/server/admin/dashboard/queries";
import { truncate } from "@/server/admin/format";

const COLUMNS: DataTableColumn<RecentAuditEntry>[] = [
  {
    key: "when",
    header: "When",
    cell: (row) => <LocalDateTime value={row.createdAt} className="whitespace-nowrap" />,
  },
  {
    key: "actor",
    header: "Who",
    cell: (row) => row.actorEmail ?? <span className="text-ink-subtle">Not signed in</span>,
  },
  {
    key: "action",
    header: "Action",
    cell: (row) => <code className="font-mono text-caption">{row.action}</code>,
  },
  {
    key: "target",
    header: "Target",
    cell: (row) => (
      <span title={row.entityId ?? undefined}>
        {row.entityType}
        {row.entityId ? (
          <span className="text-ink-subtle"> {truncate(row.entityId, 8)}</span>
        ) : null}
      </span>
    ),
  },
  { key: "summary", header: "Summary", cell: (row) => truncate(row.summary, 80) },
];

/** The latest audit entries. Only rendered for users who hold audit:read. */
export function RecentActivity({ rows }: { rows: readonly RecentAuditEntry[] }) {
  return (
    <DataTable
      caption="Recent activity"
      // The section heading above already labels the table; the caption stays for assistive tech.
      hideCaption
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      emptyState={
        <EmptyState
          titleAs="p"
          title="No activity has been recorded yet."
          description="Sign-ins and changes made in the admin are recorded here."
          className="py-10"
        />
      }
    />
  );
}
