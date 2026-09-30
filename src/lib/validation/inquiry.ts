import { z } from "zod";
import { isCategorySlug } from "@/content/categories";
import { attachmentField, type UploadRules } from "./attachment";
import type { DateWindow } from "./dates";
import {
  consentField,
  emailField,
  optionalChoiceField,
  optionalCountryField,
  optionalDateField,
  optionalLine,
  optionalMultiline,
  optionalSlugField,
  phoneField,
  requiredCountryField,
  requiredLine,
} from "./fields";
import { FIELD_LIMITS } from "./limits";

/** The "Other / not sure" choice of the category field. It is stored as no category. */
export const CATEGORY_OTHER = "other";

export function isInquiryCategory(value: string): boolean {
  return value === CATEGORY_OTHER || isCategorySlug(value);
}

/**
 * The business inquiry (RFQ) as the form submits it. The browser and the server use the same
 * schema; only the delivery-date window differs (see dates.ts). Unknown keys are an error, not
 * silently dropped: the form sends exactly these fields.
 */
export function createInquirySchema(window: DateWindow) {
  return z.strictObject({
    name: requiredLine(FIELD_LIMITS.name),
    company: requiredLine(FIELD_LIMITS.company),
    country: requiredCountryField,
    email: emailField,
    phone: phoneField,
    whatsapp: phoneField,
    product: requiredLine(FIELD_LIMITS.product),
    /** Set by a link from a product page; resolved to a product on the server, never trusted. */
    productSlug: optionalSlugField,
    category: optionalChoiceField(isInquiryCategory),
    quantity: optionalLine(FIELD_LIMITS.quantity),
    specification: optionalMultiline(FIELD_LIMITS.specification),
    targetPrice: optionalLine(FIELD_LIMITS.targetPrice),
    destinationCountry: optionalCountryField,
    requiredDeliveryDate: optionalDateField(window),
    additionalRequirements: optionalMultiline(FIELD_LIMITS.additionalRequirements),
    consent: consentField,
  });
}

export type InquirySchema = ReturnType<typeof createInquirySchema>;
/** Values as the form holds them (before cleaning). */
export type InquiryInput = z.input<InquirySchema>;
/** Values as the server stores them (cleaned; optional fields are ""). */
export type InquiryData = z.output<InquirySchema>;

/** The browser's version of the schema also checks the chosen file before anything is uploaded. */
export function createInquiryFormSchema(window: DateWindow, upload: UploadRules) {
  return createInquirySchema(window).extend({ attachment: attachmentField(upload) });
}

export type InquiryFormSchema = ReturnType<typeof createInquiryFormSchema>;
export type InquiryFormInput = z.input<InquiryFormSchema>;
export type InquiryFormData = z.output<InquiryFormSchema>;
