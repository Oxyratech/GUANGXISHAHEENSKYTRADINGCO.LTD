import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { CategoryForm } from "@/components/admin/news/CategoryForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdminPage } from "@/server/admin/access";

export const metadata: Metadata = { title: "New category" };

export default async function NewNewsCategoryPage() {
  const access = await requireAdminPage("news:write", { next: "/admin/news/categories/new" });
  if (!access.ok) return <AdminAccessFailure access={access} permission="news:write" />;

  return (
    <>
      <PageHeader
        title="New category"
        breadcrumbs={[
          { label: "News", href: "/admin/news" },
          { label: "Categories", href: "/admin/news/categories" },
          { label: "New category" },
        ]}
      />
      <CategoryForm />
    </>
  );
}
