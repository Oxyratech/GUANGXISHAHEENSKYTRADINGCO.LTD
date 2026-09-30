import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { PageHeader } from "@/components/admin/PageHeader";
import { CreateProductForm } from "@/components/admin/products/CreateProductForm";
import { requireAdminPage } from "@/server/admin/access";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const access = await requireAdminPage("product:write", { next: "/admin/products/new" });
  if (!access.ok) return <AdminAccessFailure access={access} permission="product:write" />;

  return (
    <>
      <PageHeader
        title="New product"
        breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: "New product" }]}
      />
      <CreateProductForm />
    </>
  );
}
