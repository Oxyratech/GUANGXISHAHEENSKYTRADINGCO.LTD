import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminNotFound } from "@/components/admin/AdminNotFound";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { CategoryForm } from "@/components/admin/news/CategoryForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { asDatabaseOutage, requireAdminPage } from "@/server/admin/access";
import { getNewsCategory } from "@/server/admin/news/categories/queries";

export const metadata: Metadata = { title: "Edit category" };

export default async function EditNewsCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireAdminPage("news:write", { next: `/admin/news/categories/${id}` });
  if (!access.ok) return <AdminAccessFailure access={access} permission="news:write" />;

  let category;
  try {
    category = await getNewsCategory(id);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Edit category" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }
  if (!category) return <AdminNotFound />;

  return (
    <>
      <PageHeader
        title={category.names.en || category.slug}
        breadcrumbs={[
          { label: "News", href: "/admin/news" },
          { label: "Categories", href: "/admin/news/categories" },
          { label: category.names.en || category.slug },
        ]}
      />
      <CategoryForm category={category} />
    </>
  );
}
