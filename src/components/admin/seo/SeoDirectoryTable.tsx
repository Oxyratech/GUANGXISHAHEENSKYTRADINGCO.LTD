import { AdminLink } from "@/components/admin/AdminLink";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LOCALES } from "@/i18n/locales";
import type { SeoDirectoryEntry } from "@/server/admin/seo/queries";
import { scopeSlug } from "@/server/admin/seo/scope-path";

const COLUMNS: DataTableColumn<SeoDirectoryEntry>[] = [
  {
    key: "target",
    header: "Page",
    rowHeader: true,
    cell: (row) => (
      <AdminLink href={`/admin/seo/${scopeSlug(row.scope)}/${row.refKey}`}>{row.label}</AdminLink>
    ),
  },
  {
    key: "path",
    header: "Public path",
    cell: (row) => <span className="font-mono text-caption text-ink-muted">{row.publicPath}</span>,
  },
  {
    key: "locales",
    header: "Overridden in",
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        {LOCALES.map((locale) =>
          row.overriddenLocales.includes(locale) ? (
            <Badge key={locale} variant="success">
              {locale.toUpperCase()}
            </Badge>
          ) : (
            <Badge key={locale}>{locale.toUpperCase()}</Badge>
          ),
        )}
      </div>
    ),
  },
];

/** The directory of static pages / categories, each showing which locales already carry an override. */
export function SeoDirectoryTable({
  rows,
  caption,
}: {
  rows: readonly SeoDirectoryEntry[];
  caption: string;
}) {
  return (
    <DataTable
      caption={caption}
      hideCaption
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => `${row.scope}:${row.refKey}`}
      emptyState={<EmptyState titleAs="p" title="Nothing to show." className="py-10" />}
    />
  );
}
