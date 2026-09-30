import { isPlausiblePhone } from "@/lib/validation/phone";

/*
 * "Contact customer" links, built from what the buyer actually typed on the inquiry form (already
 * loosely validated by isPlausiblePhone when it was submitted, but this file re-validates rather than
 * trusting a value that has since sat in the database). wa.me and tel: both want digits only, with an
 * optional leading "+" for tel:; wa.me never wants the "+" at all.
 */

export function buildInquiryMailto(email: string, referenceCode: string): string {
  const subject = encodeURIComponent(`Your inquiry ${referenceCode}`);
  return `mailto:${encodeURIComponent(email)}?subject=${subject}`;
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/** `tel:` link, or null when the stored value is not a plausible phone number. */
export function buildTelHref(phone: string | null | undefined): string | null {
  if (!phone || !isPlausiblePhone(phone)) return null;
  const digits = digitsOf(phone);
  return digits ? `tel:+${digits}` : null;
}

/** `https://wa.me/<digits>` link, or null when the stored value is not a plausible phone number. */
export function buildWhatsAppHref(whatsapp: string | null | undefined): string | null {
  if (!whatsapp || !isPlausiblePhone(whatsapp)) return null;
  const digits = digitsOf(whatsapp);
  return digits ? `https://wa.me/${digits}` : null;
}
