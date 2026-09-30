import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { InquiryFilters } from "@/components/admin/inquiries/InquiryFilters";
import { InquiryStatusTabs } from "@/components/admin/inquiries/InquiryStatusTabs";
import { InquiryTable } from "@/components/admin/inquiries/InquiryTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { asDatabaseOutage, requireAdminPage } from "@/server/admin/access";
import { listAssignableUsers } from "@/server/admin/inquiries/assignees";
import { parseInquiryListFilters } from "@/server/admin/inquiries/filters";
import { listInquiries } from "@/server/admin/inquiries/list";
import { parsePageParams, type RawSearchParams } from "@/server/admin/pagination";

export const metadata: Metadata = { title: "Inquiries" };

const PATHNAME = "/admin/inquiries";

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const access = await requireAdminPage("inquiry:read");
  if (!access.ok) return <AdminAccessFailure access={access} permission="inquiry:read" />;

  const rawSearchParams = await searchParams;
  const filters = parseInquiryListFilters(rawSearchParams);
  const page = parsePageParams(rawSearchParams);

  let result;
  let assignableUsers;
  try {
    [result, assignableUsers] = await Promise.all([
      listInquiries(filters, page),
      listAssignableUsers(),
    ]);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Inquiries" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  const hasActiveFilters = Boolean(
    filters.q ||
    filters.status ||
    filters.category ||
    filters.country ||
    filters.assignee ||
    filters.from ||
    filters.to,
  );

  return (
    <>
      <PageHeader
        title="Inquiries"
        description="Business inquiries submitted through the public site, newest first."
      />
      <div className="grid gap-4">
        <InquiryStatusTabs
          pathname={PATHNAME}
          searchParams={rawSearchParams}
          counts={result.statusCounts}
          total={result.total}
          active={filters.status}
        />
        <InquiryFilters
          searchParams={rawSearchParams}
          filters={filters}
          assignableUsers={assignableUsers}
        />
        <InquiryTable rows={result.rows} hasActiveFilters={hasActiveFilters} />
        <AdminPagination
          meta={result.meta}
          pathname={PATHNAME}
          searchParams={rawSearchParams}
          itemLabel="inquiries"
        />
      </div>
    </>
  );
}
