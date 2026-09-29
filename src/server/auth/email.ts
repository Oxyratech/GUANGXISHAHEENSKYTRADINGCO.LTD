// No `server-only`: shared with the create-admin CLI, which runs under tsx.

/** Accounts are keyed by the trimmed, lower-cased address so "A@x.com" and "a@x.com" are one user. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Deliberately loose (real validation happens by sending mail); catches typos and junk only. */
export function isPlausibleEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
