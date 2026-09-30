import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { InquiryStatusChangeRow } from "@/server/admin/inquiries/detail";

/** Who changed the status, when, and from what to what — oldest first, ending with the current one. */
export function InquiryTimeline({ changes }: { changes: readonly InquiryStatusChangeRow[] }) {
  if (changes.length === 0) {
    return <p className="text-small text-ink-muted">No status history yet.</p>;
  }

  return (
    <ol className="grid gap-3">
      {changes.map((change) => (
        <li key={change.id} className="flex flex-wrap items-center gap-2 text-small">
          <LocalDateTime value={change.createdAt} className="text-ink-muted" />
          <span className="text-ink-subtle" aria-hidden>
            &middot;
          </span>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {change.fromStatus ? <StatusBadge status={change.fromStatus} /> : null}
            {change.fromStatus ? (
              <span aria-hidden className="text-ink-subtle">
                &rarr;
              </span>
            ) : null}
            <StatusBadge status={change.toStatus} />
          </span>
          <span className="text-ink-muted">by {change.changedBy?.name ?? "the public form"}</span>
        </li>
      ))}
    </ol>
  );
}
