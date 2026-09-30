import { FilterBar } from "@/components/admin/FilterBar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { RawSearchParams } from "@/server/admin/pagination";
import type { ContactListFilters } from "@/server/admin/contact-messages/filters";

const FILTER_KEYS = ["q", "sort"] as const;

/** The search box and sort control above the contact messages table. Status is its own set of tabs. */
export function ContactFilters({
  searchParams,
  filters,
}: {
  searchParams: RawSearchParams;
  filters: ContactListFilters;
}) {
  return (
    <FilterBar
      pathname="/admin/contact-messages"
      searchParams={searchParams}
      filterKeys={FILTER_KEYS}
      label="Filter contact messages"
    >
      <div className="grid min-w-48 flex-1 gap-1.5">
        <label htmlFor="contact-search" className="text-label text-ink">
          Search
        </label>
        <Input
          id="contact-search"
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Reference, name, company, email"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="contact-sort" className="text-label text-ink">
          Sort
        </label>
        <Select id="contact-sort" name="sort" defaultValue={filters.sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
      </div>
    </FilterBar>
  );
}
