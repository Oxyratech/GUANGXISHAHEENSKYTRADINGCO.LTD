import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminButtonLink } from "@/components/admin/AdminLink";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { TagsTable } from "@/components/admin/news/TagsTable";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { listNewsTags } from "@/server/admin/news/tags/queries";

export const metadata: Metadata = { title: "News tags" };

export default async function NewsTagsPage() {
  const access = await requireAdminPage("news:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="news:read" />;

  let tags;
  try {
    tags = await listNewsTags();
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="News tags" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  const canWrite = hasAdminPermission(access.session, "news:write");

  return (
    <>
      <PageHeader
        title="News tags"
        breadcrumbs={[{ label: "News", href: "/admin/news" }, { label: "Tags" }]}
        actions={canWrite ? <AdminButtonLink href="/admin/news/tags/new">New tag</AdminButtonLink> : null}
      />
      <TagsTable rows={tags} />
    </>
  );
}
