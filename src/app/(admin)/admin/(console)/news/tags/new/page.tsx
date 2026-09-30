import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { PageHeader } from "@/components/admin/PageHeader";
import { TagForm } from "@/components/admin/news/TagForm";
import { requireAdminPage } from "@/server/admin/access";

export const metadata: Metadata = { title: "New tag" };

export default async function NewNewsTagPage() {
  const access = await requireAdminPage("news:write", { next: "/admin/news/tags/new" });
  if (!access.ok) return <AdminAccessFailure access={access} permission="news:write" />;

  return (
    <>
      <PageHeader
        title="New tag"
        breadcrumbs={[
          { label: "News", href: "/admin/news" },
          { label: "Tags", href: "/admin/news/tags" },
          { label: "New tag" },
        ]}
      />
      <TagForm />
    </>
  );
}
