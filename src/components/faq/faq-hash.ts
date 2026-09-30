/*
 * The address bar's #fragment as an external store, so the accordion can open the question a link
 * points at without effects: the server snapshot is "" (everything closed) and the browser's real
 * hash follows straight after hydration.
 */
const listeners = new Set<() => void>();

export function subscribeToHash(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

export const getHash = () => window.location.hash;
export const getServerHash = () => "";

/**
 * Points the address bar at the open question, or clears it when none is open. replaceState adds no
 * history entry and never scrolls; it fires no event, so subscribers are told directly.
 */
export function replaceHash(id: string): void {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", id ? `#${id}` : `${pathname}${search}`);
  listeners.forEach((notify) => notify());
}

/** The question a fragment names, or undefined when it names something else (a group, a typo). */
export function itemIdFromHash(hash: string, ids: ReadonlySet<string>): string | undefined {
  let id = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed escape cannot match a question id.
  }
  return ids.has(id) ? id : undefined;
}
