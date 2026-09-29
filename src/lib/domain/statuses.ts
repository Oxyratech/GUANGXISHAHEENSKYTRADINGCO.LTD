/**
 * Domain vocabularies stored as strings in the database (the SQL Server connector has no enums).
 * These constants are the single source for: zod validation, the seed, the initial migration's
 * CHECK constraints / lookup rows, and admin UI labels.
 */

export const PUBLISH_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const MEDIA_KINDS = ["IMAGE", "DOCUMENT"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_VISIBILITIES = ["PUBLIC", "PRIVATE"] as const;
export type MediaVisibility = (typeof MEDIA_VISIBILITIES)[number];

export const DOCUMENT_KINDS = ["SPECIFICATION_SHEET", "CATALOGUE", "CERTIFICATE", "OTHER"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const CONTACT_MESSAGE_STATUSES = ["NEW", "READ", "REPLIED", "ARCHIVED"] as const;
export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

export const SEO_SCOPES = ["PAGE", "CATEGORY", "PRODUCT", "NEWS"] as const;
export type SeoScope = (typeof SEO_SCOPES)[number];

/** Inquiry lifecycle, in pipeline order. Mirrors the `InquiryStatus` lookup table rows. */
export const INQUIRY_STATUS_DEFINITIONS = [
  { code: "NEW", label: "New", sortOrder: 1, isTerminal: false },
  { code: "REVIEWING", label: "Reviewing", sortOrder: 2, isTerminal: false },
  { code: "QUALIFIED", label: "Qualified", sortOrder: 3, isTerminal: false },
  { code: "QUOTATION", label: "Quotation", sortOrder: 4, isTerminal: false },
  { code: "NEGOTIATION", label: "Negotiation", sortOrder: 5, isTerminal: false },
  { code: "CONFIRMED", label: "Confirmed", sortOrder: 6, isTerminal: false },
  { code: "COMPLETED", label: "Completed", sortOrder: 7, isTerminal: true },
  { code: "CANCELLED", label: "Cancelled", sortOrder: 8, isTerminal: true },
] as const;

export type InquiryStatus = (typeof INQUIRY_STATUS_DEFINITIONS)[number]["code"];
export const INQUIRY_STATUSES = INQUIRY_STATUS_DEFINITIONS.map(
  (s) => s.code,
) as readonly InquiryStatus[];

export function isInquiryStatus(value: string): value is InquiryStatus {
  return (INQUIRY_STATUSES as readonly string[]).includes(value);
}
