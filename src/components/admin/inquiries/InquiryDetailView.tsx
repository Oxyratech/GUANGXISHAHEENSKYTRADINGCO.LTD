import type { ReactNode } from "react";
import { CopyValue } from "@/components/admin/CopyValue";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { InquiryDetail } from "@/server/admin/inquiries/detail";
import type { AssigneeOption } from "@/server/admin/inquiries/assignees";
import { InquiryAssignForm } from "./InquiryAssignForm";
import { InquiryAttachments } from "./InquiryAttachments";
import { InquiryContactActions } from "./InquiryContactActions";
import { InquiryNotes } from "./InquiryNotes";
import { InquiryOverview } from "./InquiryOverview";
import { InquiryStatusForm } from "./InquiryStatusForm";
import { InquiryTimeline } from "./InquiryTimeline";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-card">
      <h2 className="text-body font-semibold text-navy-900">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The inquiry detail page's body. `canUpdate`/`canNote` come from the signed-in session's permissions
 * (checked again, on the server, by every action this page can trigger — this only decides what to
 * draw).
 */
export function InquiryDetailView({
  inquiry,
  assignableUsers,
  canUpdate,
  canNote,
}: {
  inquiry: InquiryDetail;
  assignableUsers: readonly AssigneeOption[];
  canUpdate: boolean;
  canNote: boolean;
}) {
  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            <span className="font-mono">{inquiry.referenceCode}</span>
            <StatusBadge status={inquiry.status} />
          </span>
        }
        description={
          <CopyValue value={inquiry.referenceCode} label="reference code" mono={false} />
        }
        breadcrumbs={[
          { label: "Inquiries", href: "/admin/inquiries" },
          { label: inquiry.referenceCode },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <Card title="Inquiry details">
            <InquiryOverview inquiry={inquiry} />
          </Card>
          <Card title="Attachments">
            <InquiryAttachments attachments={inquiry.attachments} />
          </Card>
          <Card title="Status history">
            <InquiryTimeline changes={inquiry.statusChanges} />
          </Card>
          <Card title="Internal notes">
            <InquiryNotes inquiryId={inquiry.id} notes={inquiry.notes} canAddNote={canNote} />
          </Card>
        </div>

        <div className="grid gap-4">
          <Card title="Contact customer">
            <InquiryContactActions
              email={inquiry.email}
              phone={inquiry.phone}
              whatsapp={inquiry.whatsapp}
              referenceCode={inquiry.referenceCode}
            />
          </Card>
          {canUpdate ? (
            <>
              <Card title="Status">
                <InquiryStatusForm
                  inquiryId={inquiry.id}
                  version={inquiry.version}
                  status={inquiry.status}
                />
              </Card>
              <Card title="Assignment">
                <InquiryAssignForm
                  inquiryId={inquiry.id}
                  version={inquiry.version}
                  assignedToId={inquiry.assignedTo?.id ?? null}
                  assignableUsers={assignableUsers}
                />
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
