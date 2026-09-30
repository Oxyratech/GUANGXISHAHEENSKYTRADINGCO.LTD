import { ImageOff } from "lucide-react";
import { AdminLink } from "@/components/admin/AdminLink";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MediaThumbnail } from "@/components/admin/media/MediaThumbnail";
import { TranslationChips } from "@/components/admin/products/TranslationChips";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { humanizeCode } from "@/server/admin/format";
import type { ProductListRow } from "@/server/admin/products/list";

const COLUMNS: DataTableColumn<ProductListRow>[] = [
  {
    key: "image",
    header: "",
    cell: (row) => (
      <div className="size-12 overflow-hidden rounded-md border border-line bg-surface">
        {row.primaryImage ? (
          <MediaThumbnail
            kind="IMAGE"
            visibility="PUBLIC"
            id={row.primaryImage.id}
            fileName={row.primaryImage.fileName}
          />
        ) : (
          <div
            role="img"
            aria-label="No image"
            className="grid size-full place-items-center bg-surface text-ink-subtle"
          >
            <ImageOff aria-hidden className="size-5" />
          </div>
        )}
      </div>
    ),
  },
  {
    key: "name",
    header: "Name",
    rowHeader: true,
    cell: (row) => (
      <AdminLink href={`/admin/products/${row.id}`}>
        <span className="block">{row.displayName}</span>
        <span className="block font-mono text-caption text-ink-muted">{row.slug}</span>
      </AdminLink>
    ),
  },
  { key: "category", header: "Category", cell: (row) => humanizeCode(row.categorySlug) },
  { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  {
    key: "translations",
    header: "Translations",
    cell: (row) => <TranslationChips present={row.translatedLocales} />,
  },
  {
    key: "updated",
    header: "Updated",
    cell: (row) => <LocalDateTime value={row.updatedAt} className="whitespace-nowrap" />,
  },
];

/** The products list table. `hasActiveFilters` tells a filtered "no matches" apart from a truly empty catalogue. */
export function ProductTable({
  rows,
  hasActiveFilters,
}: {
  rows: readonly ProductListRow[];
  hasActiveFilters: boolean;
}) {
  return (
    <DataTable
      caption="Products"
      hideCaption
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      emptyState={
        hasActiveFilters ? (
          <EmptyState
            titleAs="p"
            title="No products match these filters."
            description="Try a different search, or reset the filters to see every product."
            className="py-10"
          />
        ) : (
          <EmptyState
            titleAs="p"
            title="No products have been created yet."
            description='Use "New product" to add the first one.'
            className="py-10"
          />
        )
      }
    />
  );
}
