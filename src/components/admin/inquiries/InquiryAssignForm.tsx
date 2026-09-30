"use client";

import { useRouter } from "next/navigation";
import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Select } from "@/components/ui/select";
import { assignInquiry } from "@/server/admin/inquiries/actions";
import type { AssigneeOption } from "@/server/admin/inquiries/assignees";

/** Hands the inquiry to an active admin user, or clears the assignment. */
export function InquiryAssignForm({
  inquiryId,
  version,
  assignedToId,
  assignableUsers,
}: {
  inquiryId: string;
  version: number;
  assignedToId: string | null;
  assignableUsers: readonly AssigneeOption[];
}) {
  const router = useRouter();

  return (
    <ActionForm
      key={version}
      action={assignInquiry}
      successMessage="Assignment updated"
      onSuccess={() => router.refresh()}
    >
      <input type="hidden" name="id" value={inquiryId} />
      <input type="hidden" name="version" value={version} />
      <ActionField name="assigneeId" label="Assigned to">
        {(control) => (
          <Select {...control} name="assigneeId" defaultValue={assignedToId ?? ""}>
            <option value="">Unassigned</option>
            {assignableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        )}
      </ActionField>
      <div>
        <ActionSubmit pendingLabel="Saving…">Save assignment</ActionSubmit>
      </div>
    </ActionForm>
  );
}
