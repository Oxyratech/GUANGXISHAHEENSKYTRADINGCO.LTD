export { CATEGORY_OTHER, createInquiryFormSchema, createInquirySchema } from "./inquiry";
export type { InquiryData, InquiryFormData, InquiryFormInput, InquiryInput } from "./inquiry";
export { contactSchema } from "./contact";
export type { ContactData, ContactInput } from "./contact";
export { parseInquiryPrefill, type InquiryPrefill } from "./prefill";
export { localDeliveryWindow, serverDeliveryWindow, type DateWindow } from "./dates";
export { FIELD_LIMITS } from "./limits";
export {
  messageKey,
  parseMessageKey,
  resolveMessage,
  type MessageKey,
  type MessageTranslator,
} from "./message-key";
export type { UploadRules } from "./attachment";
