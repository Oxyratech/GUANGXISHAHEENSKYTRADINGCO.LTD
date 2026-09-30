import { AdminLink } from "@/components/admin/AdminLink";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { SeoScope } from "@/lib/domain/statuses";
import type { SeoSearchResult } from "@/server/admin/seo/queries";
import { scopeSlug } from "@/server/admin/seo/scope-path";

const COLUMNS: DataTableColumn<SeoSearchResult>[] = [
  {
    key: "label",
    header: "Name",
    rowHeader: true,
    cell: (row) => <span className="text-ink">{row.label}</span>,
  },
  { key: "sublabel", header: "Details", cell: (row) => row.sublabel },
];

/** Search results for the PRODUCT/NEWS tabs: too numerous to list in full, so they are found by name. */
export function SeoSearchTable({
  scope,
  results,
  query,
}: {
  scope: SeoScope;
  results: readonly SeoSearchResult[];
  query: string;
}) {
  const columns: DataTableColumn<SeoSearchResult>[] = COLUMNS.map((column) =>
    column.key === "label"
      ? {
          ...column,
          cell: (row: SeoSearchResult) => (
            <AdminLink href={`/admin/seo/${scopeSlug(scope)}/${row.refKey}`}>{row.label}</AdminLink>
          ),
        }
      : column,
  );

  return (
    <DataTable
      caption="Search results"
      hideCaption
      columns={columns}
      rows={results}
      getRowKey={(row) => row.refKey}
      emptyState={
        <EmptyState
          titleAs="p"
          title={query ? "No matches." : "Type a name or slug to find a target."}
          className="py-10"
        />
      }
    />
  );
}
