import { FilterBar } from "@/components/admin/FilterBar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LOCALES } from "@/i18n/locales";
import { PUBLISH_STATUSES } from "@/lib/domain/statuses";
import { humanizeCode } from "@/server/admin/format";
import type { NewsListFilters } from "@/server/admin/news/filters";
import type { RawSearchParams } from "@/server/admin/pagination";

const FILTER_KEYS = ["q", "locale", "status", "category", "sort"] as const;

export function NewsFilters({
  searchParams,
  filters,
  categories,
}: {
  searchParams: RawSearchParams;
  filters: NewsListFilters;
  categories: readonly { slug: string; name: string }[];
}) {
  return (
    <FilterBar
      pathname="/admin/news"
      searchParams={searchParams}
      filterKeys={FILTER_KEYS}
      label="Filter news"
    >
      <div className="grid min-w-48 flex-1 gap-1.5">
        <label htmlFor="news-search" className="text-label text-ink">
          Search
        </label>
        <Input
          id="news-search"
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Title or slug"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="news-locale" className="text-label text-ink">
          Locale
        </label>
        <Select id="news-locale" name="locale" defaultValue={filters.locale}>
          <option value="">Any locale</option>
          {LOCALES.map((locale) => (
            <option key={locale} value={locale}>
              {locale.toUpperCase()}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="news-status" className="text-label text-ink">
          Status
        </label>
        <Select id="news-status" name="status" defaultValue={filters.status}>
          <option value="">Any status</option>
          {PUBLISH_STATUSES.map((status) => (
            <option key={status} value={status}>
              {humanizeCode(status)}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="news-category" className="text-label text-ink">
          Category
        </label>
        <Select id="news-category" name="category" defaultValue={filters.category}>
          <option value="">Any category</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="news-sort" className="text-label text-ink">
          Sort
        </label>
        <Select id="news-sort" name="sort" defaultValue={filters.sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title</option>
        </Select>
      </div>
    </FilterBar>
  );
}
