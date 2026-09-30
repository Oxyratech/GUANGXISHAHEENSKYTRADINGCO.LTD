"use client";

import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { markContactMessageHandled } from "@/server/admin/contact-messages/actions";

/** Marks the message handled by whoever is signed in right now. Not destructive, so no confirmation. */
export function ContactHandledButton({
  messageId,
  handledByName,
}: {
  messageId: string;
  handledByName: string | null;
}) {
  const router = useRouter();

  return (
    <ActionForm
      action={markContactMessageHandled}
      successMessage="Marked as handled"
      onSuccess={() => router.refresh()}
    >
      <input type="hidden" name="id" value={messageId} />
      <div className="flex flex-wrap items-center gap-3">
        <ActionSubmit variant="outline" pendingLabel="Saving…">
          Mark handled by me
        </ActionSubmit>
        {handledByName ? (
          <p className="text-small text-ink-muted">Currently handled by {handledByName}.</p>
        ) : null}
      </div>
    </ActionForm>
  );
}
