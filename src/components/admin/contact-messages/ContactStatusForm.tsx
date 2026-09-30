"use client";

import { useRouter } from "next/navigation";
import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Select } from "@/components/ui/select";
import { CONTACT_MESSAGE_STATUSES } from "@/lib/domain/statuses";
import { humanizeCode } from "@/server/admin/format";
import { changeContactMessageStatus } from "@/server/admin/contact-messages/actions";

/** Moves a contact message through NEW / READ / REPLIED / ARCHIVED. */
export function ContactStatusForm({ messageId, status }: { messageId: string; status: string }) {
  const router = useRouter();

  return (
    <ActionForm
      key={status}
      action={changeContactMessageStatus}
      successMessage="Status updated"
      onSuccess={() => router.refresh()}
    >
      <input type="hidden" name="id" value={messageId} />
      <ActionField name="status" label="Status" required>
        {(control) => (
          <Select {...control} name="status" defaultValue={status}>
            {CONTACT_MESSAGE_STATUSES.map((code) => (
              <option key={code} value={code}>
                {humanizeCode(code)}
              </option>
            ))}
          </Select>
        )}
      </ActionField>
      <div>
        <ActionSubmit pendingLabel="Updating…">Update status</ActionSubmit>
      </div>
    </ActionForm>
  );
}
