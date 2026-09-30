import {
  FORM_TOKEN_FIELD_NAME,
  HONEYPOT_FIELD_NAME,
  LOCALE_FIELD_NAME,
} from "@/lib/validation/form-fields";

export interface SubmissionExtras {
  locale: string;
  /** From the token endpoint; empty when it could not be fetched (the server then refuses). */
  token: string;
  /** What is in the hidden trap field: empty for a person. */
  honeypot: string;
}

/**
 * Turns validated form values into the FormData a Server Action receives. Text is sent as typed
 * (the server cleans it again and is the authority), consent as "true", a chosen file as a file
 * part, and empty or unset fields are left out so the payload stays small.
 */
export function serializeForm(values: object, extras: SubmissionExtras): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === "string") {
      if (value !== "") data.append(name, value);
    } else if (value === true) {
      data.append(name, "true");
    } else if (value instanceof Blob) {
      data.append(name, value);
    }
  }
  data.append(LOCALE_FIELD_NAME, extras.locale);
  data.append(FORM_TOKEN_FIELD_NAME, extras.token);
  if (extras.honeypot !== "") data.append(HONEYPOT_FIELD_NAME, extras.honeypot);
  return data;
}
