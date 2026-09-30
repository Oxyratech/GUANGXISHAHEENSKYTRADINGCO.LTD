import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { ContactDetailView } from "@/components/admin/contact-messages/ContactDetailView";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { asDatabaseOutage, hasAdminPermission, requireAdminPage } from "@/server/admin/access";
import { getContactMessageDetail } from "@/server/admin/contact-messages/detail";

export const metadata: Metadata = { title: "Contact message" };

export default async function ContactMessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireAdminPage("contact:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="contact:read" />;
  const { session } = access;

  const { id } = await params;

  let message;
  try {
    message = await getContactMessageDetail(id);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Contact message" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  if (!message) notFound();

  return (
    <ContactDetailView
      message={message}
      canUpdate={hasAdminPermission(session, "contact:update")}
    />
  );
}
