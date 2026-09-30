import { AdminLink } from "@/components/admin/AdminLink";
import { LocaleCoverageBadges } from "@/components/admin/translations/LocaleCoverageBadges";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { NewsGroupCoverage } from "@/server/admin/translations/news";

const COLUMNS: DataTableColumn<NewsGroupCoverage>[] = [
  {
    key: "title",
    header: "Story",
    rowHeader: true,
    cell: (row) => {
      const first = row.articles[0];
      return first ? (
        <AdminLink href={`/admin/news/${first.id}`}>{row.title}</AdminLink>
      ) : (
        row.title
      );
    },
  },
  {
    key: "locales",
    header: "Locales",
    cell: (row) => <LocaleCoverageBadges present={row.locales} />,
  },
  {
    key: "missing",
    header: "Missing",
    cell: (row) =>
      row.missingLocales.length > 0 ? (
        <AdminLink href={`/admin/news/${row.articles[0]?.id}`}>Create translation</AdminLink>
      ) : (
        "Complete"
      ),
  },
];

export function NewsCoverageTable({ rows }: { rows: readonly NewsGroupCoverage[] }) {
  const missing = rows.filter((row) => row.missingLocales.length > 0).length;
  return (
    <div className="grid gap-3">
      <p className="text-small text-ink-muted">
        {rows.length === 0
          ? "No news stories exist yet."
          : missing === 0
            ? `All ${rows.length} stories are translated into every locale.`
            : `${missing} of ${rows.length} stories are missing at least one locale.`}
      </p>
      <DataTable
        caption="News translation coverage"
        hideCaption
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.translationGroupId}
        emptyState={<EmptyState titleAs="p" title="No news articles yet." className="py-10" />}
      />
    </div>
  );
}
