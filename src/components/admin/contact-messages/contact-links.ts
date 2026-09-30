/** `mailto:` reply link, with the reference code in a prefilled subject. */
export function buildContactReplyMailto(email: string, referenceCode: string): string {
  const subject = encodeURIComponent(`Re: your message ${referenceCode}`);
  return `mailto:${encodeURIComponent(email)}?subject=${subject}`;
}
