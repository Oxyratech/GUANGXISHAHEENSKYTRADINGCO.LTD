import { AdminLink } from "@/components/admin/AdminLink";
import { DefinitionList, type DefinitionItem } from "@/components/admin/DefinitionList";
import { LocalDateTime } from "@/components/admin/LocalDateTime";
import { formatCountryCode, humanizeCode } from "@/server/admin/format";
import type { InquiryDetail } from "@/server/admin/inquiries/detail";

/** Every field the buyer submitted, laid out as a definition list. Country codes show as names. */
export function InquiryOverview({ inquiry }: { inquiry: InquiryDetail }) {
  const items: DefinitionItem[] = [
    { label: "Name", value: inquiry.name },
    { label: "Company", value: inquiry.company },
    { label: "Country", value: formatCountryCode(inquiry.country) },
    { label: "Email", value: inquiry.email },
    { label: "Phone", value: inquiry.phone },
    { label: "WhatsApp", value: inquiry.whatsapp },
    { label: "Product", value: inquiry.productName },
    {
      label: "Category",
      value: inquiry.categorySlug ? humanizeCode(inquiry.categorySlug) : null,
    },
    {
      label: "Source product",
      value: inquiry.product ? (
        <AdminLink href={`/admin/products/${inquiry.product.id}`}>{inquiry.product.name}</AdminLink>
      ) : null,
    },
    { label: "Quantity", value: inquiry.quantity },
    { label: "Target price", value: inquiry.targetPrice },
    {
      label: "Destination country",
      value: inquiry.destinationCountry ? formatCountryCode(inquiry.destinationCountry) : null,
    },
    {
      label: "Required delivery date",
      value: inquiry.requiredDeliveryDate ? (
        <LocalDateTime value={inquiry.requiredDeliveryDate} dateOnly />
      ) : null,
    },
    { label: "Specification", value: inquiry.specification, wide: true },
    { label: "Additional requirements", value: inquiry.additionalRequirements, wide: true },
    { label: "Submitted in", value: inquiry.locale.toUpperCase() },
    {
      label: "Consent given",
      value: <LocalDateTime value={inquiry.consentAcceptedAt} />,
    },
    { label: "Received", value: <LocalDateTime value={inquiry.createdAt} /> },
  ];

  return <DefinitionList items={items} columns={3} />;
}
