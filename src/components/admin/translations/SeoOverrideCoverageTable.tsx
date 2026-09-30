import { AdminLink } from "@/components/admin/AdminLink";
import { LocaleCoverageBadges } from "@/components/admin/translations/LocaleCoverageBadges";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { SeoOverrideCoverage } from "@/server/admin/translations/seo";
import { scopeSlug } from "@/server/admin/seo/scope-path";

const COLUMNS: DataTableColumn<SeoOverrideCoverage>[] = [
  {
    key: "target",
    header: "Target",
    rowHeader: true,
    cell: (row) => (
      <AdminLink href={`/admin/seo/${scopeSlug(row.scope)}/${row.refKey}`}>
        {row.scope}: {row.refKey}
      </AdminLink>
    ),
  },
  {
    key: "locales",
    header: "Overridden in",
    cell: (row) => <LocaleCoverageBadges present={row.locales} />,
  },
];

export function SeoOverrideCoverageTable({ rows }: { rows: readonly SeoOverrideCoverage[] }) {
  return (
    <div className="grid gap-3">
      <p className="text-small text-ink-muted">
        {rows.length === 0
          ? "No SEO overrides have been created yet. Every page shows its default metadata."
          : `${rows.length} target${rows.length === 1 ? "" : "s"} ${rows.length === 1 ? "has" : "have"} at least one override.`}
      </p>
      <DataTable
        caption="SEO override locale coverage"
        hideCaption
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => `${row.scope}:${row.refKey}`}
        emptyState={<EmptyState titleAs="p" title="No SEO overrides yet." className="py-10" />}
      />
    </div>
  );
}
