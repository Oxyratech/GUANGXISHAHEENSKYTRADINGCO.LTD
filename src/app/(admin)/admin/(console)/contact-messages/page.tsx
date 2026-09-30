import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { ContactFilters } from "@/components/admin/contact-messages/ContactFilters";
import { ContactStatusTabs } from "@/components/admin/contact-messages/ContactStatusTabs";
import { ContactTable } from "@/components/admin/contact-messages/ContactTable";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { asDatabaseOutage, requireAdminPage } from "@/server/admin/access";
import { parseContactListFilters } from "@/server/admin/contact-messages/filters";
import { listContactMessages } from "@/server/admin/contact-messages/list";
import { parsePageParams, type RawSearchParams } from "@/server/admin/pagination";

export const metadata: Metadata = { title: "Contact messages" };

const PATHNAME = "/admin/contact-messages";

export default async function ContactMessagesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requireAdminPage("contact:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="contact:read" />;

  const rawSearchParams = await searchParams;
  const filters = parseContactListFilters(rawSearchParams);
  const page = parsePageParams(rawSearchParams);

  let result;
  try {
    result = await listContactMessages(filters, page);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Contact messages" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  const hasActiveFilters = Boolean(filters.q || filters.status);

  return (
    <>
      <PageHeader
        title="Contact messages"
        description="General messages submitted through the public contact form, newest first."
      />
      <div className="grid gap-4">
        <ContactStatusTabs
          pathname={PATHNAME}
          searchParams={rawSearchParams}
          counts={result.statusCounts}
          total={result.total}
          active={filters.status}
        />
        <ContactFilters searchParams={rawSearchParams} filters={filters} />
        <ContactTable rows={result.rows} hasActiveFilters={hasActiveFilters} />
        <AdminPagination
          meta={result.meta}
          pathname={PATHNAME}
          searchParams={rawSearchParams}
          itemLabel="messages"
        />
      </div>
    </>
  );
}
