"use client";

import { useRouter } from "next/navigation";
import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { Textarea } from "@/components/ui/textarea";
import { addInquiryNote } from "@/server/admin/inquiries/actions";
import type { InquiryNoteRow } from "@/server/admin/inquiries/detail";

/*
 * Internal notes. They are visible only here: the public site never selects InquiryNote (see the
 * "internal only" comment on that model in prisma/schema.prisma), so nothing written in this box
 * ever reaches a buyer.
 */
export function InquiryNotes({
  inquiryId,
  notes,
  canAddNote,
}: {
  inquiryId: string;
  notes: readonly InquiryNoteRow[];
  canAddNote: boolean;
}) {
  const router = useRouter();

  return (
    <div className="grid gap-4">
      {notes.length === 0 ? (
        <p className="text-small text-ink-muted">No internal notes yet.</p>
      ) : (
        <ul className="grid gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-line bg-white p-3">
              <p className="text-small whitespace-pre-wrap text-ink">{note.body}</p>
              <p className="mt-2 text-caption text-ink-muted">
                {note.author?.name ?? "Unknown"} &middot; <LocalDateTime value={note.createdAt} />
              </p>
            </li>
          ))}
        </ul>
      )}

      {canAddNote ? (
        <ActionForm
          key={notes.length}
          action={addInquiryNote}
          successMessage="Note added"
          onSuccess={() => router.refresh()}
        >
          <input type="hidden" name="id" value={inquiryId} />
          <ActionField name="body" label="Add an internal note" required>
            <Textarea maxLength={4000} placeholder="Only staff can see this." />
          </ActionField>
          <div>
            <ActionSubmit pendingLabel="Saving…">Add note</ActionSubmit>
          </div>
        </ActionForm>
      ) : null}
    </div>
  );
}
