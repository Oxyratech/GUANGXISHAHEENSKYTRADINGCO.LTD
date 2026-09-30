import type { Metadata } from "next";
import { AdminAccessFailure } from "@/components/admin/AdminAccessFailure";
import { AdminNotFound } from "@/components/admin/AdminNotFound";
import { DatabaseUnavailablePanel } from "@/components/admin/DatabaseUnavailablePanel";
import { DefinitionList, type DefinitionItem } from "@/components/admin/DefinitionList";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { PageHeader } from "@/components/admin/PageHeader";
import { asDatabaseOutage, requireAdminPage } from "@/server/admin/access";
import { getAuditLogById } from "@/server/admin/audit/queries";

export const metadata: Metadata = { title: "Audit entry" };

/** The full 64-character ipHash is never shown; only enough of a prefix to spot a repeat at a glance. */
const IP_HASH_PREFIX_LENGTH = 8;

function formatMetadata(metadata: string | null): string | null {
  if (!metadata) return null;
  try {
    return JSON.stringify(JSON.parse(metadata), null, 2);
  } catch {
    return metadata;
  }
}

export default async function AuditLogDetailPage({ params }: PageProps<"/admin/audit-logs/[id]">) {
  const { id } = await params;
  const access = await requireAdminPage("audit:read", { next: `/admin/audit-logs/${id}` });
  if (!access.ok) return <AdminAccessFailure access={access} permission="audit:read" />;

  let entry;
  try {
    entry = await getAuditLogById(id);
  } catch (error) {
    const outage = asDatabaseOutage(error);
    if (!outage) throw error;
    return (
      <>
        <PageHeader title="Audit entry" />
        <DatabaseUnavailablePanel cause={outage.cause} titleAs="h2" />
      </>
    );
  }
  if (!entry) return <AdminNotFound />;

  const summary: DefinitionItem[] = [
    { label: "Time", value: <LocalDateTime value={entry.createdAt} /> },
    { label: "Actor", value: entry.actorEmail },
    { label: "Action", value: <code className="font-mono text-small">{entry.action}</code> },
    {
      label: "Entity type",
      value: <code className="font-mono text-small">{entry.entityType}</code>,
    },
    {
      label: "Entity id",
      value: entry.entityId ? <code className="font-mono text-small">{entry.entityId}</code> : null,
    },
    { label: "Summary", value: entry.summary, wide: true },
    {
      label: "IP hash (prefix)",
      value: entry.ipHash ? (
        <code className="font-mono text-small">
          {entry.ipHash.slice(0, IP_HASH_PREFIX_LENGTH)}&hellip;
        </code>
      ) : null,
    },
  ];

  const metadata = formatMetadata(entry.metadata);

  return (
    <>
      <PageHeader
        title="Audit entry"
        breadcrumbs={[{ label: "Audit log", href: "/admin/audit-logs" }, { label: entry.action }]}
      />

      <div className="grid gap-6">
        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <DefinitionList items={summary} columns={2} />
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-card">
          <h2 className="mb-3 text-label text-ink">Metadata</h2>
          {metadata ? (
            <pre className="overflow-x-auto rounded-md bg-surface p-4 font-mono text-caption text-ink">
              {metadata}
            </pre>
          ) : (
            <p className="text-small text-ink-muted">No additional metadata was recorded.</p>
          )}
        </section>
      </div>
    </>
  );
}
