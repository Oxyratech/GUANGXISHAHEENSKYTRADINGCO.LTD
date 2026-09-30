import { MessageCircle, Phone, Send } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { CopyValue } from "@/components/admin/CopyValue";
import { buildInquiryMailto, buildTelHref, buildWhatsAppHref } from "./contact-links";

/** Ways to reach the buyer directly: email (subject prefilled with the reference), phone, WhatsApp. */
export function InquiryContactActions({
  email,
  phone,
  whatsapp,
  referenceCode,
}: {
  email: string;
  phone: string | null;
  whatsapp: string | null;
  referenceCode: string;
}) {
  const telHref = buildTelHref(phone);
  const whatsappHref = buildWhatsAppHref(whatsapp);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ButtonLink href={buildInquiryMailto(email, referenceCode)} variant="outline" size="sm">
          <Send aria-hidden className="size-4" />
          Email customer
        </ButtonLink>
        {telHref ? (
          <ButtonLink href={telHref} variant="outline" size="sm">
            <Phone aria-hidden className="size-4" />
            Call
          </ButtonLink>
        ) : null}
        {whatsappHref ? (
          <ButtonLink href={whatsappHref} variant="outline" size="sm" target="_blank">
            <MessageCircle aria-hidden className="size-4" />
            WhatsApp
            <span className="sr-only">(opens in a new tab)</span>
          </ButtonLink>
        ) : null}
      </div>
      <CopyValue value={email} label="email address" mono={false} />
    </div>
  );
}
