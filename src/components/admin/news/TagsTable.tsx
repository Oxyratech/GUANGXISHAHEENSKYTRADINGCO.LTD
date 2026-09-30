import { AdminLink } from "@/components/admin/AdminLink";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { NewsTagRow } from "@/server/admin/news/tags/queries";

const COLUMNS: DataTableColumn<NewsTagRow>[] = [
  {
    key: "name",
    header: "Name (EN)",
    rowHeader: true,
    cell: (row) => <AdminLink href={`/admin/news/tags/${row.id}`}>{row.names.en}</AdminLink>,
  },
  {
    key: "slug",
    header: "Slug",
    cell: (row) => <span className="font-mono text-caption">{row.slug}</span>,
  },
  { key: "articles", header: "Articles", align: "center", cell: (row) => row.articleCount },
];

export function TagsTable({ rows }: { rows: readonly NewsTagRow[] }) {
  return (
    <DataTable
      caption="News tags"
      hideCaption
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      emptyState={
        <EmptyState
          titleAs="p"
          title="No tags yet."
          description="Tags can also be created inline from the article editor."
          className="py-10"
        />
      }
    />
  );
}
