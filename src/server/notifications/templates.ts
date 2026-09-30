import { CATEGORY_OTHER, type InquiryData } from "@/lib/validation/inquiry";
import type { ContactData } from "@/lib/validation/contact";
import { getCountryName, isCountryCode } from "@/lib/countries";
import type { Locale } from "@/i18n/locales";

/*
 * Staff notification e-mails. They go to the company's own inbox, in English, and say only what the
 * visitor typed plus the reference code. They never speak to the customer and never claim that the
 * customer was e-mailed. Every value is escaped for the HTML part; the text part is the primary one.
 */

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

interface Row {
  label: string;
  value: string;
  /** Long free text: shown as an indented block. */
  multiline?: boolean;
}

export interface InquiryNotification {
  referenceCode: string;
  submittedAt: Date;
  locale: Locale;
  data: InquiryData;
  attachment: { fileName: string; sizeBytes: number } | null;
}

export interface ContactNotification {
  referenceCode: string;
  submittedAt: Date;
  locale: Locale;
  data: ContactData;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

function countryLabel(code: string): string {
  return isCountryCode(code) ? `${getCountryName(code, "en")} (${code})` : code;
}

function categoryLabel(category: string): string {
  return category === CATEGORY_OTHER ? "Other / not sure" : category;
}

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Only fields the visitor filled in, in the order they appear on the form. */
function present(rows: readonly (Row | false)[]): Row[] {
  return rows.filter((row): row is Row => row !== false && row.value !== "");
}

const optional = (label: string, value: string, multiline = false): Row | false =>
  value !== "" && { label, value, multiline };

function renderText(heading: string, rows: readonly Row[]): string {
  const lines = rows.map(({ label, value, multiline }) =>
    multiline
      ? `${label}:\n${value
          .split("\n")
          .map((line) => `    ${line}`)
          .join("\n")}`
      : `${label}: ${value}`,
  );
  return [
    heading,
    "",
    ...lines,
    "",
    "Sent automatically by the website. Reply to this message to write to the sender directly.",
  ].join("\n");
}

function renderHtml(heading: string, rows: readonly Row[]): string {
  const cells = rows
    .map(
      ({ label, value }) =>
        `<tr><th align="left" valign="top" style="padding:4px 12px 4px 0;font-weight:600">${escapeHtml(label)}</th>` +
        `<td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return (
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#121826">` +
    `<h1 style="font-size:18px">${escapeHtml(heading)}</h1>` +
    `<table role="presentation" cellpadding="0" cellspacing="0">${cells}</table>` +
    `<p style="color:#4a5468">Sent automatically by the website. Reply to this message to write to the sender directly.</p>` +
    `</div>`
  );
}

function compose(subject: string, heading: string, rows: readonly Row[]): EmailContent {
  return { subject, text: renderText(heading, rows), html: renderHtml(heading, rows) };
}

export function buildInquiryEmail(details: InquiryNotification): EmailContent {
  const { referenceCode, submittedAt, locale, data, attachment } = details;
  const rows = present([
    { label: "Reference", value: referenceCode },
    { label: "Received (UTC)", value: submittedAt.toISOString() },
    { label: "Site language", value: locale },
    { label: "Name", value: data.name },
    { label: "Company", value: data.company },
    { label: "Country", value: countryLabel(data.country) },
    { label: "Email", value: data.email },
    optional("Phone", data.phone),
    optional("WhatsApp", data.whatsapp),
    { label: "Product", value: data.product },
    optional("Category", categoryLabel(data.category)),
    optional("Quantity", data.quantity),
    optional("Specification", data.specification, true),
    optional("Target price", data.targetPrice),
    optional(
      "Destination country",
      data.destinationCountry && countryLabel(data.destinationCountry),
    ),
    optional("Required delivery date", data.requiredDeliveryDate),
    optional("Additional requirements", data.additionalRequirements, true),
    attachment !== null && {
      label: "Attachment",
      value: `${attachment.fileName} (${formatBytes(attachment.sizeBytes)}), stored privately`,
    },
  ]);
  return compose(
    `New business inquiry ${referenceCode}`,
    `New business inquiry ${referenceCode}`,
    rows,
  );
}

export function buildContactEmail(details: ContactNotification): EmailContent {
  const { referenceCode, submittedAt, locale, data } = details;
  const rows = present([
    { label: "Reference", value: referenceCode },
    { label: "Received (UTC)", value: submittedAt.toISOString() },
    { label: "Site language", value: locale },
    { label: "Name", value: data.name },
    optional("Company", data.company),
    { label: "Email", value: data.email },
    optional("Phone", data.phone),
    optional("Country", data.country && countryLabel(data.country)),
    { label: "Message", value: data.message, multiline: true },
  ]);
  return compose(
    `New contact message ${referenceCode}`,
    `New contact message ${referenceCode}`,
    rows,
  );
}
