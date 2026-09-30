import { Download, Paperclip } from "lucide-react";
import { EmptyPanel } from "@/components/admin/EmptyPanel";
import { formatBytes } from "@/server/admin/format";
import type { InquiryAttachmentRow } from "@/server/admin/inquiries/detail";

/**
 * Attachments the buyer uploaded with the inquiry. The download goes through `/files/[id]`, which
 * itself re-checks the session and the `inquiry:read` permission — this list is a convenience, not
 * the access control.
 */
export function InquiryAttachments({
  attachments,
}: {
  attachments: readonly InquiryAttachmentRow[];
}) {
  if (attachments.length === 0) {
    return (
      <EmptyPanel
        titleAs="p"
        title="No files were attached to this inquiry."
        icon={<Paperclip aria-hidden />}
      />
    );
  }

  return (
    <ul className="grid gap-2">
      {attachments.map((attachment) => (
        <li
          key={attachment.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-3"
        >
          <div className="grid min-w-0 gap-0.5">
            <span className="truncate text-small text-ink">{attachment.fileName}</span>
            <span className="text-caption text-ink-muted">
              {attachment.mimeType} &middot; {formatBytes(attachment.sizeBytes)}
            </span>
          </div>
          <a
            href={`/files/${attachment.mediaAssetId}`}
            className="inline-flex items-center gap-1.5 rounded-xs text-small text-blue-700 underline-offset-4 hover:text-blue-800 hover:underline"
          >
            <Download aria-hidden className="size-4" />
            Download
          </a>
        </li>
      ))}
    </ul>
  );
}
