import { toDialString } from "./setting-keys";

/** `mailto:` URL for a validated email address. */
export function mailtoHref(email: string): string {
  const at = email.lastIndexOf("@");
  return `mailto:${encodeURIComponent(email.slice(0, at))}@${email.slice(at + 1)}`;
}

/** `tel:` URL for a number in international format. */
export function telHref(phone: string): string {
  return `tel:${toDialString(phone)}`;
}

/** WhatsApp click-to-chat link; wa.me wants the number without the leading "+". */
export function whatsappHref(number: string): string {
  return `https://wa.me/${toDialString(number).slice(1)}`;
}
