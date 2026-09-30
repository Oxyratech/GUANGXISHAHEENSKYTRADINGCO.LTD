import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminButtonLink } from "@/components/admin/AdminLink";
import { CategoriesTable } from "@/components/admin/news/CategoriesTable";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { listNewsCategories } from "@/server/admin/news/categories/queries";

export const metadata: Metadata = { title: "News categories" };

export default async function NewsCategoriesPage() {
  const access = await requireAdminPage("news:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="news:read" />;

  let categories;
  try {
    categories = await listNewsCategories();
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="News categories" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  const canWrite = hasAdminPermission(access.session, "news:write");

  return (
    <>
      <PageHeader
        title="News categories"
        breadcrumbs={[{ label: "News", href: "/admin/news" }, { label: "Categories" }]}
        actions={
          canWrite ? (
            <AdminButtonLink href="/admin/news/categories/new">New category</AdminButtonLink>
          ) : null
        }
      />
      <CategoriesTable rows={categories} />
    </>
  );
}
