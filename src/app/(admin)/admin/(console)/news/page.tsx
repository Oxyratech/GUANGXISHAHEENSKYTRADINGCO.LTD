import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminButtonLink } from "@/components/admin/AdminLink";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { NewsFilters } from "@/components/admin/news/NewsFilters";
import { NewsTable } from "@/components/admin/news/NewsTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { listNewsCategories } from "@/server/admin/news/categories/queries";
import { parseNewsListFilters } from "@/server/admin/news/filters";
import { listNewsArticles } from "@/server/admin/news/list";
import { parsePageParams, type RawSearchParams } from "@/server/admin/pagination";

export const metadata: Metadata = { title: "News" };

const PATHNAME = "/admin/news";

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requireAdminPage("news:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="news:read" />;

  const rawSearchParams = await searchParams;
  const filters = parseNewsListFilters(rawSearchParams);
  const page = parsePageParams(rawSearchParams);

  let result;
  let categories;
  try {
    [result, categories] = await Promise.all([listNewsArticles(filters, page), listNewsCategories()]);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="News" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  const hasActiveFilters = Boolean(filters.q || filters.locale || filters.status || filters.category);
  const canWrite = hasAdminPermission(access.session, "news:write");

  return (
    <>
      <PageHeader
        title="News"
        description="Articles across every locale, newest first."
        actions={
          <>
            <AdminButtonLink href="/admin/news/categories" variant="outline">
              Categories
            </AdminButtonLink>
            <AdminButtonLink href="/admin/news/tags" variant="outline">
              Tags
            </AdminButtonLink>
            {canWrite ? <AdminButtonLink href="/admin/news/new">New article</AdminButtonLink> : null}
          </>
        }
      />
      <div className="grid gap-4">
        <NewsFilters
          searchParams={rawSearchParams}
          filters={filters}
          categories={categories.map((c) => ({ slug: c.slug, name: c.names.en || c.slug }))}
        />
        <NewsTable rows={result.rows} hasActiveFilters={hasActiveFilters} />
        <AdminPagination meta={result.meta} pathname={PATHNAME} searchParams={rawSearchParams} itemLabel="articles" />
      </div>
    </>
  );
}
