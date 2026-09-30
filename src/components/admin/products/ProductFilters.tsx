import { FilterBar } from "@/components/admin/FilterBar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORY_SLUGS } from "@/content/categories";
import { PUBLISH_STATUSES } from "@/lib/domain/statuses";
import { humanizeCode } from "@/server/admin/format";
import type { RawSearchParams } from "@/server/admin/pagination";
import type { ProductListFilters } from "@/server/admin/products/filters";

const FILTER_KEYS = ["q", "status", "category", "sort"] as const;

/** The search box and dropdown filters above the products table. */
export function ProductFilters({
  searchParams,
  filters,
}: {
  searchParams: RawSearchParams;
  filters: ProductListFilters;
}) {
  return (
    <FilterBar
      pathname="/admin/products"
      searchParams={searchParams}
      filterKeys={FILTER_KEYS}
      label="Filter products"
    >
      <div className="grid min-w-48 flex-1 gap-1.5">
        <label htmlFor="product-search" className="text-label text-ink">
          Search
        </label>
        <Input
          id="product-search"
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Name or slug"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="product-status" className="text-label text-ink">
          Status
        </label>
        <Select id="product-status" name="status" defaultValue={filters.status}>
          <option value="">Any status</option>
          {PUBLISH_STATUSES.map((status) => (
            <option key={status} value={status}>
              {humanizeCode(status)}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="product-category" className="text-label text-ink">
          Category
        </label>
        <Select id="product-category" name="category" defaultValue={filters.category}>
          <option value="">Any category</option>
          {CATEGORY_SLUGS.map((slug) => (
            <option key={slug} value={slug}>
              {humanizeCode(slug)}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="product-sort" className="text-label text-ink">
          Sort
        </label>
        <Select id="product-sort" name="sort" defaultValue={filters.sort}>
          <option value="updated">Recently updated</option>
          <option value="name">Name</option>
          <option value="sortOrder">Editor order</option>
        </Select>
      </div>
    </FilterBar>
  );
}
