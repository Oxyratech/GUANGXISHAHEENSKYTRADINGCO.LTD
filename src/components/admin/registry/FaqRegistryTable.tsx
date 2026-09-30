import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { FaqRegistryRow } from "@/server/admin/registry/faqs";
import { PublicPageLinks } from "./PublicPageLinks";

/** Every FAQ entry, read-only: the `faq` namespace and src/components/faq/faq-outline.ts drive it. */
export function FaqRegistryTable({ rows }: { rows: readonly FaqRegistryRow[] }) {
  const columns: DataTableColumn<FaqRegistryRow>[] = [
    {
      key: "question",
      header: "Question",
      rowHeader: true,
      cell: (row) => (
        <div className="grid max-w-md gap-0.5">
          <span className="text-navy-900">{row.question}</span>
          <span className="font-mono text-caption text-ink-muted">{row.itemId}</span>
        </div>
      ),
    },
    { key: "group", header: "Group", cell: (row) => row.groupLabel },
    {
      key: "public",
      header: "Public page",
      cell: (row) => <PublicPageLinks paths={row.publicPaths} />,
    },
  ];

  return (
    <DataTable
      caption="Frequently asked questions, grouped as they appear on the public page"
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.itemId}
    />
  );
}
