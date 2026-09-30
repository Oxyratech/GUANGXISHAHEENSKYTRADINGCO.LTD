import type { MessageKey } from "@/lib/validation/message-key";

/**
 * What a form action answers. Messages are translation keys (see @/lib/validation/message-key),
 * resolved in the visitor's language by the form. `fieldErrors` is keyed by form field name.
 */
export type ActionResult =
  | { ok: true; referenceCode: string }
  | { ok: false; formError?: MessageKey; fieldErrors?: Record<string, MessageKey> };

/** `useActionState` state: null until the form has been submitted. */
export type FormState = ActionResult | null;
