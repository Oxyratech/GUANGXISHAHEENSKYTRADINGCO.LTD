"use server";

import { createFormToken } from "@/server/security/anti-spam";
import { handleContactSubmission } from "./submit-contact";
import { handleInquirySubmission } from "./submit-inquiry";
import type { ActionResult, FormState } from "./types";

/*
 * Server Actions of the public forms. They are entry points anyone can POST to, so each one does
 * its own checking (see the handlers); nothing here trusts the page that rendered the form.
 * The first argument is the previous state that useActionState passes along; it is not used.
 */

/**
 * A fresh signed, timestamped token for a form. The pages are statically generated, so the token
 * cannot be baked into their HTML: the form asks for one when it mounts (and again after a
 * refused submission).
 */
export async function issueFormToken(): Promise<string> {
  return createFormToken();
}

export async function submitInquiry(
  _previous: FormState,
  formData: FormData,
): Promise<ActionResult> {
  return handleInquirySubmission(formData);
}

export async function submitContactMessage(
  _previous: FormState,
  formData: FormData,
): Promise<ActionResult> {
  return handleContactSubmission(formData);
}
