import { AdminLink } from "@/components/admin/AdminLink";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { NewsCategoryRow } from "@/server/admin/news/categories/queries";

const COLUMNS: DataTableColumn<NewsCategoryRow>[] = [
  {
    key: "name",
    header: "Name (EN)",
    rowHeader: true,
    cell: (row) => <AdminLink href={`/admin/news/categories/${row.id}`}>{row.names.en}</AdminLink>,
  },
  { key: "slug", header: "Slug", cell: (row) => <span className="font-mono text-caption">{row.slug}</span> },
  { key: "sortOrder", header: "Order", align: "center", cell: (row) => row.sortOrder },
  { key: "articles", header: "Articles", align: "center", cell: (row) => row.articleCount },
];

export function CategoriesTable({ rows }: { rows: readonly NewsCategoryRow[] }) {
  return (
    <DataTable
      caption="News categories"
      hideCaption
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      emptyState={
        <EmptyState
          titleAs="p"
          title="No categories yet."
          description="Create a category to organise news articles."
          className="py-10"
        />
      }
    />
  );
}
