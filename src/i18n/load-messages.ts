import type { Locale } from "./locales";
import type { Messages } from "./messages";
import { NAMESPACES } from "./namespaces";

/** Loads and merges every namespace file for a locale. Server-side only. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const mod = (await import(`../messages/${locale}/${ns}.json`)) as { default: unknown };
      return [ns, mod.default] as const;
    }),
  );
  return Object.fromEntries(entries) as Messages;
}
