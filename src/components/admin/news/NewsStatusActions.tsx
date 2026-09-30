"use client";

import { ConfirmButton } from "@/components/admin/ConfirmButton";
import type { PublishStatus } from "@/lib/domain/statuses";
import { setNewsStatus } from "@/server/admin/news/actions";

const COPY: Record<
  PublishStatus,
  { label: string; title: string; description: string; destructive: boolean }
> = {
  DRAFT: {
    label: "Revert to draft",
    title: "Revert to draft?",
    description: "The article will no longer be visible on the public site.",
    destructive: true,
  },
  PUBLISHED: {
    label: "Publish",
    title: "Publish this article?",
    description: "It becomes visible on the public site immediately (or at its scheduled date).",
    destructive: false,
  },
  ARCHIVED: {
    label: "Archive",
    title: "Archive this article?",
    description: "It is removed from public listings but its page and history are kept.",
    destructive: true,
  },
};

/** One button per status the article is not already in, gated by news:publish on the server. */
export function NewsStatusActions({
  id,
  version,
  status,
}: {
  id: string;
  version: number;
  status: PublishStatus;
}) {
  const targets = (Object.keys(COPY) as PublishStatus[]).filter(
    (candidate) => candidate !== status,
  );

  return (
    <div className="flex flex-wrap gap-2">
      {targets.map((target) => {
        const copy = COPY[target];
        return (
          <ConfirmButton
            key={target}
            action={setNewsStatus}
            fields={{ id, version: String(version), status: target }}
            label={copy.label}
            variant="outline"
            size="sm"
            destructive={copy.destructive}
            title={copy.title}
            description={copy.description}
            confirmLabel={copy.label}
          />
        );
      })}
    </div>
  );
}
