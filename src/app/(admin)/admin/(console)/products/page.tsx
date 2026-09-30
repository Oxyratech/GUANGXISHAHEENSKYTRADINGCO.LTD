import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminButtonLink } from "@/components/admin/AdminLink";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductFilters } from "@/components/admin/products/ProductFilters";
import { ProductTable } from "@/components/admin/products/ProductTable";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { parseProductListFilters } from "@/server/admin/products/filters";
import { listProducts } from "@/server/admin/products/list";
import { parsePageParams, type RawSearchParams } from "@/server/admin/pagination";

export const metadata: Metadata = { title: "Products" };

const PATHNAME = "/admin/products";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requireAdminPage("product:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="product:read" />;
  const { session } = access;

  const rawSearchParams = await searchParams;
  const filters = parseProductListFilters(rawSearchParams);
  const page = parsePageParams(rawSearchParams);

  const canWrite = hasAdminPermission(session, "product:write");
  const newProductAction = canWrite ? (
    <AdminButtonLink href="/admin/products/new">New product</AdminButtonLink>
  ) : null;

  let result;
  try {
    result = await listProducts(filters, page);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Products" actions={newProductAction} />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  const hasActiveFilters = Boolean(filters.q || filters.status || filters.category);

  return (
    <>
      <PageHeader
        title="Products"
        description="The catalogue shown on the public site, in every status."
        actions={newProductAction}
      />
      <div className="grid gap-4">
        <ProductFilters searchParams={rawSearchParams} filters={filters} />
        <ProductTable rows={result.rows} hasActiveFilters={hasActiveFilters} />
        <AdminPagination
          meta={result.meta}
          pathname={PATHNAME}
          searchParams={rawSearchParams}
          itemLabel="products"
        />
      </div>
    </>
  );
}
