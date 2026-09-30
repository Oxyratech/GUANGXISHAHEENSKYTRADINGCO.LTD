import { AdminLink } from "@/components/admin/AdminLink";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { NewsListRow } from "@/server/admin/news/list";

const COLUMNS: DataTableColumn<NewsListRow>[] = [
  {
    key: "title",
    header: "Title",
    rowHeader: true,
    cell: (row) => (
      <div className="grid gap-0.5">
        <AdminLink href={`/admin/news/${row.id}`}>{row.title}</AdminLink>
        <span className="font-mono text-caption text-ink-muted">{row.slug}</span>
      </div>
    ),
  },
  {
    key: "locale",
    header: "Locale",
    cell: (row) => (
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="blue">{row.locale.toUpperCase()}</Badge>
        {row.siblingLocales.map((locale) => (
          <Badge key={locale}>{locale.toUpperCase()}</Badge>
        ))}
      </div>
    ),
  },
  { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  {
    key: "publishedAt",
    header: "Published",
    cell: (row) => (row.publishedAt ? <LocalDateTime value={row.publishedAt} dateOnly /> : null),
  },
  { key: "author", header: "Author", cell: (row) => row.authorName },
  { key: "category", header: "Category", cell: (row) => row.category?.name ?? null },
];

export function NewsTable({
  rows,
  hasActiveFilters,
}: {
  rows: readonly NewsListRow[];
  hasActiveFilters: boolean;
}) {
  return (
    <DataTable
      caption="News articles"
      hideCaption
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      emptyState={
        hasActiveFilters ? (
          <EmptyState
            titleAs="p"
            title="No articles match these filters."
            description="Try a different search, or reset the filters."
            className="py-10"
          />
        ) : (
          <EmptyState
            titleAs="p"
            title="No news articles yet."
            description="Articles created here will appear in this list."
            className="py-10"
          />
        )
      }
    />
  );
}
