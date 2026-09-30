import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { ServiceRegistryRow } from "@/server/admin/registry/services";
import { PublicPageLinks } from "./PublicPageLinks";

/** The 6 service lines, read-only: they are code (src/content/services.ts), not database rows. */
export function ServiceRegistryTable({ rows }: { rows: readonly ServiceRegistryRow[] }) {
  const columns: DataTableColumn<ServiceRegistryRow>[] = [
    {
      key: "name",
      header: "Service",
      rowHeader: true,
      cell: (row) => (
        <div className="grid gap-0.5">
          <span className="text-navy-900">{row.name}</span>
          <span className="font-mono text-caption text-ink-muted">{row.slug}</span>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Related registered scope items",
      cell: (row) => (
        <ul className="max-w-sm text-caption text-ink-muted" lang="zh-CN">
          {row.relatedScopeItemsZh.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
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
      caption="Business lines, each with a dedicated public page"
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.slug}
    />
  );
}
