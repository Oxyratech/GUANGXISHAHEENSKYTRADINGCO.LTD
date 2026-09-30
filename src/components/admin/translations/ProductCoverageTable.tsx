import { AdminLink } from "@/components/admin/AdminLink";
import { LocaleCoverageBadges } from "@/components/admin/translations/LocaleCoverageBadges";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProductTranslationCoverage } from "@/server/admin/translations/products";

const COLUMNS: DataTableColumn<ProductTranslationCoverage>[] = [
  {
    key: "slug",
    header: "Product",
    rowHeader: true,
    cell: (row) => <AdminLink href={`/admin/products/${row.id}`}>{row.slug}</AdminLink>,
  },
  { key: "category", header: "Category", cell: (row) => row.categorySlug },
  { key: "locales", header: "Locales", cell: (row) => <LocaleCoverageBadges present={row.locales} /> },
];

export function ProductCoverageTable({ rows }: { rows: readonly ProductTranslationCoverage[] }) {
  const missing = rows.filter((row) => row.missingLocales.length > 0).length;
  return (
    <div className="grid gap-3">
      <p className="text-small text-ink-muted">
        {rows.length === 0
          ? "No products exist yet."
          : missing === 0
            ? `All ${rows.length} products are translated into every locale.`
            : `${missing} of ${rows.length} products are missing at least one locale.`}
      </p>
      <DataTable
        caption="Product translation coverage"
        hideCaption
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyState={<EmptyState titleAs="p" title="No products yet." className="py-10" />}
      />
    </div>
  );
}
