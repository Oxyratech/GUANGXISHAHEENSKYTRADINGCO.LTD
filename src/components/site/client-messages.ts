import type { Messages } from "@/i18n/messages";

/**
 * The only namespaces shipped to the browser. Client components (header islands, forms, error
 * boundaries) read these through useTranslations; every other namespace is rendered on the server.
 * Adding a client component that needs another namespace means adding it here.
 */
export const CLIENT_NAMESPACES = ["common", "errors", "validation", "inquiry", "contact"] as const;

export type ClientMessages = Pick<Messages, (typeof CLIENT_NAMESPACES)[number]>;

export function pickClientMessages(messages: Messages): ClientMessages {
  return {
    common: messages.common,
    errors: messages.errors,
    validation: messages.validation,
    inquiry: messages.inquiry,
    contact: messages.contact,
  };
}
