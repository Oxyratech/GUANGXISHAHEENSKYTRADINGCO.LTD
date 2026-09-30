"use client";

import { useRouter } from "next/navigation";
import { ActionField } from "@/components/admin/ActionField";
import { ActionForm } from "@/components/admin/ActionForm";
import { ActionSubmit } from "@/components/admin/ActionSubmit";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/select";
import { INQUIRY_STATUS_DEFINITIONS, isInquiryStatus } from "@/lib/domain/statuses";
import { changeInquiryStatus } from "@/server/admin/inquiries/actions";

/** Moves the inquiry through its 8-status pipeline. A terminal status gets a gentle warning first. */
export function InquiryStatusForm({
  inquiryId,
  version,
  status,
}: {
  inquiryId: string;
  version: number;
  status: string;
}) {
  const router = useRouter();
  const current = INQUIRY_STATUS_DEFINITIONS.find((entry) => entry.code === status);

  return (
    <div className="grid gap-3">
      {current?.isTerminal ? (
        <Alert variant="warning" title="This inquiry is in a closed state">
          Changing it will reopen it in the pipeline.
        </Alert>
      ) : null}
      <ActionForm
        key={version}
        action={changeInquiryStatus}
        successMessage="Status updated"
        onSuccess={() => router.refresh()}
      >
        <input type="hidden" name="id" value={inquiryId} />
        <input type="hidden" name="version" value={version} />
        <ActionField name="status" label="Status" required>
          {(control) => (
            <Select {...control} name="status" defaultValue={isInquiryStatus(status) ? status : ""}>
              {INQUIRY_STATUS_DEFINITIONS.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </Select>
          )}
        </ActionField>
        <div>
          <ActionSubmit pendingLabel="Updating…">Update status</ActionSubmit>
        </div>
      </ActionForm>
    </div>
  );
}
