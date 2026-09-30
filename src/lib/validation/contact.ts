import { z } from "zod";
import {
  consentField,
  emailField,
  optionalCountryField,
  optionalLine,
  phoneField,
  requiredLine,
  requiredMultiline,
} from "./fields";
import { FIELD_LIMITS } from "./limits";

/** A general message to the team, as the contact form submits it. Unknown keys are an error. */
export const contactSchema = z.strictObject({
  name: requiredLine(FIELD_LIMITS.name),
  company: optionalLine(FIELD_LIMITS.company),
  email: emailField,
  phone: phoneField,
  country: optionalCountryField,
  message: requiredMultiline(FIELD_LIMITS.message),
  consent: consentField,
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;
