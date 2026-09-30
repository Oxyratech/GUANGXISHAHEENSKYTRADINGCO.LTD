/**
 * Names of the two anti-spam fields every public form carries. They mirror HONEYPOT_FIELD and
 * FORM_TOKEN_FIELD in @/server/security/anti-spam, which cannot be imported into the browser
 * (form-fields.test.ts fails if the two ever differ).
 */
export const HONEYPOT_FIELD_NAME = "website_url";
export const FORM_TOKEN_FIELD_NAME = "form_token";

/** The hidden field that tells the action which language the visitor was reading. */
export const LOCALE_FIELD_NAME = "locale";

/** The name of the single file field of the inquiry form. */
export const ATTACHMENT_FIELD_NAME = "attachment";
