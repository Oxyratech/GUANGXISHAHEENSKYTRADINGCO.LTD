import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { InquiryDetailView } from "@/components/admin/inquiries/InquiryDetailView";
import { PageHeader } from "@/components/admin/PageHeader";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { listAssignableUsers } from "@/server/admin/inquiries/assignees";
import { getInquiryDetail } from "@/server/admin/inquiries/detail";

export const metadata: Metadata = { title: "Inquiry" };

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminPage("inquiry:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="inquiry:read" />;
  const { session } = access;

  const { id } = await params;
  const canUpdate = hasAdminPermission(session, "inquiry:update");

  let inquiry;
  let assignableUsers: Awaited<ReturnType<typeof listAssignableUsers>> = [];
  try {
    inquiry = await getInquiryDetail(id);
    if (canUpdate) assignableUsers = await listAssignableUsers();
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Inquiry" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  if (!inquiry) notFound();

  return (
    <InquiryDetailView
      inquiry={inquiry}
      assignableUsers={assignableUsers}
      canUpdate={canUpdate}
      canNote={hasAdminPermission(session, "inquiry:note")}
    />
  );
}
