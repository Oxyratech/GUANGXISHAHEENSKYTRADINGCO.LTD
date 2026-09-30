import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { PageHeader } from "@/components/admin/PageHeader";
import { CategoryRegistryTable } from "@/components/admin/registry/CategoryRegistryTable";
import { RegistryNotice } from "@/components/admin/RegistryNotice";
import { requireAdminPage } from "@/server/admin/access";
import { listCategoryRegistry } from "@/server/admin/registry/categories";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesRegistryPage() {
  const access = await requireAdminPage("category:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="category:read" />;

  const { rows, databaseUnavailable } = await listCategoryRegistry();

  return (
    <>
      <PageHeader
        title="Categories"
        description="The 12 product categories, derived from the registered business scope. They describe areas available for sourcing and trade, not current stock."
      />
      <div className="grid gap-4">
        <RegistryNotice filePath="src/content/categories.ts">
          Categories are mapped to the registered business scope and drive routing and SEO for the
          public product pages, so they are edited in the repository, not here. The published-product
          count below comes from the database.
        </RegistryNotice>
        {databaseUnavailable ? (
          <p className="text-small text-ink-muted">
            The database is not available right now, so published-product counts cannot be shown.
          </p>
        ) : null}
        <CategoryRegistryTable rows={rows} />
      </div>
    </>
  );
}
