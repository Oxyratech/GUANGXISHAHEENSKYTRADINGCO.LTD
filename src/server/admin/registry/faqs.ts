import "server-only";
import { FAQ_GROUPS, type FaqGroupId, type FaqItemId } from "@/components/faq/faq-outline";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/load-messages";

/*
 * Read-only registry of the FAQ entries (the `faq` namespace, ordered by src/components/faq/faq-outline
 * — the same module the public page uses, so this list can never drift from what visitors see).
 */

export interface FaqRegistryRow {
  itemId: FaqItemId;
  groupId: FaqGroupId;
  groupLabel: string;
  question: string;
  /** `/faq#<anchor>` per locale; the public accordion opens the matching question on load. */
  publicPaths: Record<Locale, string>;
}

function publicPathsFor(anchor: string): Record<Locale, string> {
  return Object.fromEntries(
    LOCALES.map((locale) => [locale, `/${locale}/faq#${anchor}`]),
  ) as Record<Locale, string>;
}

export async function listFaqRegistry(): Promise<FaqRegistryRow[]> {
  const messages = await loadMessages(DEFAULT_LOCALE);
  return FAQ_GROUPS.flatMap((group) =>
    group.items.map((itemId): FaqRegistryRow => ({
      itemId,
      groupId: group.id,
      groupLabel: messages.faq.groups[group.id],
      question: messages.faq.items[itemId].question,
      publicPaths: publicPathsFor(itemId),
    })),
  );
}
