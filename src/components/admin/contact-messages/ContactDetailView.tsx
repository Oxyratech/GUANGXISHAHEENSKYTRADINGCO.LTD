import type { ReactNode } from "react";
import { CopyValue } from "@/components/admin/CopyValue";
import { DefinitionList, type DefinitionItem } from "@/components/admin/DefinitionList";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ButtonLink } from "@/components/ui/button-link";
import { formatCountryCode } from "@/server/admin/format";
import type { ContactMessageDetail } from "@/server/admin/contact-messages/detail";
import { ContactHandledButton } from "./ContactHandledButton";
import { ContactStatusForm } from "./ContactStatusForm";
import { buildContactReplyMailto } from "./contact-links";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-card">
      <h2 className="text-body font-semibold text-navy-900">{title}</h2>
      {children}
    </section>
  );
}

/** The contact message detail page's body. `canUpdate` gates the status form and the handled button. */
export function ContactDetailView({
  message,
  canUpdate,
}: {
  message: ContactMessageDetail;
  canUpdate: boolean;
}) {
  const items: DefinitionItem[] = [
    { label: "Name", value: message.name },
    { label: "Company", value: message.company },
    { label: "Email", value: message.email },
    { label: "Phone", value: message.phone },
    { label: "Country", value: message.country ? formatCountryCode(message.country) : null },
    { label: "Submitted in", value: message.locale.toUpperCase() },
    { label: "Consent given", value: <LocalDateTime value={message.consentAcceptedAt} /> },
    { label: "Received", value: <LocalDateTime value={message.createdAt} /> },
    { label: "Message", value: message.message, wide: true },
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            <span className="font-mono">{message.referenceCode}</span>
            <StatusBadge status={message.status} />
          </span>
        }
        description={
          <CopyValue value={message.referenceCode} label="reference code" mono={false} />
        }
        breadcrumbs={[
          { label: "Contact messages", href: "/admin/contact-messages" },
          { label: message.referenceCode },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Message">
            <DefinitionList items={items} columns={2} />
          </Card>
        </div>

        <div className="grid gap-4">
          <Card title="Reply">
            <div className="grid gap-3">
              <ButtonLink
                href={buildContactReplyMailto(message.email, message.referenceCode)}
                variant="outline"
                size="sm"
              >
                Reply by email
              </ButtonLink>
              <CopyValue value={message.email} label="email address" mono={false} />
            </div>
          </Card>
          {canUpdate ? (
            <>
              <Card title="Status">
                <ContactStatusForm messageId={message.id} status={message.status} />
              </Card>
              <Card title="Handling">
                <ContactHandledButton
                  messageId={message.id}
                  handledByName={message.handledBy?.name ?? null}
                />
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
