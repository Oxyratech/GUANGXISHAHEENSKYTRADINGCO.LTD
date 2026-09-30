import { FilterBar } from "@/components/admin/FilterBar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORY_SLUGS } from "@/content/categories";
import { getCountryOptions } from "@/lib/countries";
import { humanizeCode } from "@/server/admin/format";
import type { RawSearchParams } from "@/server/admin/pagination";
import type { AssigneeOption } from "@/server/admin/inquiries/assignees";
import type { InquiryListFilters } from "@/server/admin/inquiries/filters";

const FILTER_KEYS = ["q", "category", "country", "assignee", "from", "to", "sort"] as const;

/**
 * The search box and dropdown filters above the inquiries table. Status is a separate set of tabs
 * (InquiryStatusTabs), so it rides along as a carried, hidden field rather than living here.
 */
export function InquiryFilters({
  searchParams,
  filters,
  assignableUsers,
}: {
  searchParams: RawSearchParams;
  filters: InquiryListFilters;
  assignableUsers: readonly AssigneeOption[];
}) {
  const countries = getCountryOptions("en");

  return (
    <FilterBar
      pathname="/admin/inquiries"
      searchParams={searchParams}
      filterKeys={FILTER_KEYS}
      label="Filter inquiries"
    >
      <div className="grid min-w-48 flex-1 gap-1.5">
        <label htmlFor="inquiry-search" className="text-label text-ink">
          Search
        </label>
        <Input
          id="inquiry-search"
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Reference, name, company, email, product"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="inquiry-category" className="text-label text-ink">
          Category
        </label>
        <Select id="inquiry-category" name="category" defaultValue={filters.category}>
          <option value="">Any category</option>
          {CATEGORY_SLUGS.map((slug) => (
            <option key={slug} value={slug}>
              {humanizeCode(slug)}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="inquiry-country" className="text-label text-ink">
          Country
        </label>
        <Select id="inquiry-country" name="country" defaultValue={filters.country}>
          <option value="">Any country</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="inquiry-assignee" className="text-label text-ink">
          Assignee
        </label>
        <Select id="inquiry-assignee" name="assignee" defaultValue={filters.assignee}>
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          {assignableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="inquiry-from" className="text-label text-ink">
          Received from
        </label>
        <Input id="inquiry-from" type="date" name="from" defaultValue={filters.from} />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="inquiry-to" className="text-label text-ink">
          Received to
        </label>
        <Input id="inquiry-to" type="date" name="to" defaultValue={filters.to} />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="inquiry-sort" className="text-label text-ink">
          Sort
        </label>
        <Select id="inquiry-sort" name="sort" defaultValue={filters.sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="status">Status</option>
        </Select>
      </div>
    </FilterBar>
  );
}
