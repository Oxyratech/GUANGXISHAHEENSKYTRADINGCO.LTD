import type { Messages } from "@/i18n/messages";

type ScopeItemId = keyof Messages["scope"]["items"];

/**
 * Message key of a registered scope item. Registry ids are plain strings, but an integrity test
 * (messages.test.ts) guarantees that `scope.items` translates every one of them, so the narrowing
 * lives here once instead of at each call site.
 */
export function scopeItemKey(id: string): `items.${ScopeItemId}` {
  return `items.${id as ScopeItemId}`;
}
