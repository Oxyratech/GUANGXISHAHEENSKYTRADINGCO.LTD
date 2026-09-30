import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminNotFound } from "@/components/admin/AdminNotFound";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { TagForm } from "@/components/admin/news/TagForm";
import { asDatabaseOutage, requireAdminPage } from "@/server/admin/access";
import { getNewsTag } from "@/server/admin/news/tags/queries";

export const metadata: Metadata = { title: "Edit tag" };

export default async function EditNewsTagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireAdminPage("news:write", { next: `/admin/news/tags/${id}` });
  if (!access.ok) return <AdminAccessFailure access={access} permission="news:write" />;

  let tag;
  try {
    tag = await getNewsTag(id);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Edit tag" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }
  if (!tag) return <AdminNotFound />;

  return (
    <>
      <PageHeader
        title={tag.names.en || tag.slug}
        breadcrumbs={[
          { label: "News", href: "/admin/news" },
          { label: "Tags", href: "/admin/news/tags" },
          { label: tag.names.en || tag.slug },
        ]}
      />
      <TagForm tag={tag} />
    </>
  );
}
