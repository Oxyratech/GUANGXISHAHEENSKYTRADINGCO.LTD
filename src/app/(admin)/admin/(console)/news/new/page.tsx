import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { NewsArticleForm } from "@/components/admin/news/NewsArticleForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { getNewsFormOptions } from "@/server/admin/news/detail";

export const metadata: Metadata = { title: "New article" };

export default async function NewNewsArticlePage() {
  const access = await requireAdminPage("news:write", { next: "/admin/news/new" });
  if (!access.ok) return <AdminAccessFailure access={access} permission="news:write" />;

  let options;
  try {
    options = await getNewsFormOptions();
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="New article" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="New article"
        breadcrumbs={[{ label: "News", href: "/admin/news" }, { label: "New article" }]}
      />
      <NewsArticleForm
        options={options}
        canPublish={hasAdminPermission(access.session, "news:publish")}
        defaultAuthorName={access.session.user.name}
      />
    </>
  );
}
