import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminLink } from "@/components/admin/AdminLink";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { FilterBar } from "@/components/admin/FilterBar";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { PageHeader } from "@/components/admin/PageHeader";
import { truncate } from "@/server/admin/format";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { asDatabaseOutage, requireAdminPage } from "@/server/admin/access";
import { buildPageMeta, parsePageParams } from "@/server/admin/pagination";
import { listAuditLogs, loadAuditLogFacets, type AuditLogRow } from "@/server/admin/audit/queries";

export const metadata: Metadata = { title: "Audit log" };

const PATHNAME = "/admin/audit-logs";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A "YYYY-MM-DD" from a date input, as a UTC instant, or undefined if blank/invalid. */
function parseDateParam(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function AuditLogsPage({ searchParams }: PageProps<"/admin/audit-logs">) {
  const access = await requireAdminPage("audit:read", { next: PATHNAME });
  if (!access.ok) return <AdminAccessFailure access={access} permission="audit:read" />;

  const rawSearchParams = await searchParams;
  const action = firstValue(rawSearchParams.action) || undefined;
  const entityType = firstValue(rawSearchParams.entityType) || undefined;
  const actorEmail = firstValue(rawSearchParams.actorEmail)?.trim() || undefined;
  const fromParam = firstValue(rawSearchParams.from);
  const toParam = firstValue(rawSearchParams.to);
  const from = parseDateParam(fromParam);
  const toExclusive = parseDateParam(toParam);
  const to = toExclusive ? new Date(toExclusive.getTime() + 24 * 60 * 60 * 1000) : undefined;
  const page = parsePageParams(rawSearchParams, { defaultPageSize: 30 });

  let rows: AuditLogRow[] = [];
  let total = 0;
  let facets: { actions: string[]; entityTypes: string[] } = { actions: [], entityTypes: [] };
  try {
    [{ rows, total }, facets] = await Promise.all([
      listAuditLogs({ action, entityType, actorEmail, from, to }, page),
      loadAuditLogFacets(),
    ]);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Audit log" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }

  const meta = buildPageMeta(total, page.page, page.pageSize);
  const hasFilters = Boolean(action || entityType || actorEmail || fromParam || toParam);

  const columns: DataTableColumn<AuditLogRow>[] = [
    {
      key: "createdAt",
      header: "Time",
      cell: (row) => <LocalDateTime value={row.createdAt} />,
    },
    {
      key: "actorEmail",
      header: "Actor",
      cell: (row) => row.actorEmail ?? <span className="text-ink-subtle">System</span>,
    },
    {
      key: "action",
      header: "Action",
      rowHeader: true,
      cell: (row) => (
        <AdminLink href={`/admin/audit-logs/${row.id}`} className="font-mono text-small">
          {row.action}
        </AdminLink>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      cell: (row) => (
        <span className="font-mono text-small text-ink-muted">
          {row.entityType}
          {row.entityId ? `:${truncate(row.entityId, 12)}` : ""}
        </span>
      ),
    },
    {
      key: "summary",
      header: "Summary",
      cell: (row) => row.summary ?? <span className="text-ink-subtle">&mdash;</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Audit log"
        description="A read-only record of state-changing admin actions."
      />

      <div className="grid gap-4">
        <FilterBar
          pathname={PATHNAME}
          searchParams={rawSearchParams}
          filterKeys={["action", "entityType", "actorEmail", "from", "to"]}
          label="Filter audit log"
        >
          <Select
            name="action"
            defaultValue={action ?? ""}
            aria-label="Filter by action"
            className="w-56"
          >
            <option value="">All actions</option>
            {facets.actions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Select
            name="entityType"
            defaultValue={entityType ?? ""}
            aria-label="Filter by entity type"
            className="w-44"
          >
            <option value="">All entity types</option>
            {facets.entityTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Input
            type="search"
            name="actorEmail"
            placeholder="Actor email"
            defaultValue={actorEmail ?? ""}
            className="w-52"
            aria-label="Filter by actor email"
          />
          <Input
            type="date"
            name="from"
            defaultValue={fromParam ?? ""}
            aria-label="From date"
            className="w-40"
          />
          <Input
            type="date"
            name="to"
            defaultValue={toParam ?? ""}
            aria-label="To date"
            className="w-40"
          />
        </FilterBar>

        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          caption="Audit log entries"
          emptyState={
            <EmptyState
              title={hasFilters ? "No entries match these filters." : "No audit entries yet."}
              description={
                hasFilters
                  ? "Try a different search or clear the filters."
                  : "State-changing admin actions will appear here."
              }
              className="py-10"
            />
          }
        />

        <AdminPagination
          meta={meta}
          pathname={PATHNAME}
          searchParams={rawSearchParams}
          itemLabel="entries"
        />
      </div>
    </>
  );
}
