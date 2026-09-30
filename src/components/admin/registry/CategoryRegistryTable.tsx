import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { CategoryRegistryRow } from "@/server/admin/registry/categories";
import { PublicPageLinks } from "./PublicPageLinks";

/** The 12 product categories, read-only: they are code (src/content/categories.ts), not database rows. */
export function CategoryRegistryTable({ rows }: { rows: readonly CategoryRegistryRow[] }) {
  const columns: DataTableColumn<CategoryRegistryRow>[] = [
    {
      key: "name",
      header: "Category",
      rowHeader: true,
      cell: (row) => (
        <div className="grid gap-0.5">
          <span className="text-navy-900">{row.name}</span>
          <span className="font-mono text-caption text-ink-muted">{row.slug}</span>
        </div>
      ),
    },
    {
      key: "regulated",
      header: "Regulated",
      cell: (row) =>
        row.regulated ? (
          <Badge variant="warning">Regulated</Badge>
        ) : (
          <span className="text-ink-subtle">No</span>
        ),
    },
    {
      key: "scope",
      header: "Registered scope items",
      cell: (row) => (
        <div className="grid max-w-sm gap-1">
          <span>{row.scopeItemCount}</span>
          <ul className="text-caption text-ink-muted" lang="zh-CN">
            {row.scopeItemsZh.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      key: "published",
      header: "Published products",
      align: "end",
      cell: (row) =>
        row.publishedCount === null ? (
          <span className="text-ink-subtle" title="The database is not available right now.">
            —
          </span>
        ) : (
          row.publishedCount.toLocaleString("en-US")
        ),
    },
    {
      key: "public",
      header: "Public page",
      cell: (row) => <PublicPageLinks paths={row.publicPaths} />,
    },
  ];

  return (
    <DataTable
      caption="Product categories, derived from the registered business scope"
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.slug}
    />
  );
}
