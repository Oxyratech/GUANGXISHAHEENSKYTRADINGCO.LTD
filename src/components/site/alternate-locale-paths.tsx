"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/locales";

/**
 * Where the current page lives in each language, for pages whose address differs per language
 * (a news article or product whose slug is translated). Paths carry no locale prefix. Without
 * this the language switcher keeps the current pathname, which is right for every page whose
 * address is the same in all languages.
 */
export type AlternateLocalePaths = Readonly<Record<Locale, string>>;

let current: AlternateLocalePaths | null = null;
const listeners = new Set<() => void>();

function publish(next: AlternateLocalePaths | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The alternates the current page registered, or null when its address is the same everywhere. */
export function useAlternateLocalePaths(): AlternateLocalePaths | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

/**
 * Render on a page whose slug differs per language: `<AlternateLocalePaths paths={{ en: "/news/a",
 * zh: "/news/b", ar: "/news" }} />`. Give every locale a path; for a language without a
 * translation point at the section index so the switcher never leads to a 404. Renders nothing.
 */
export function AlternateLocalePaths({ paths }: { paths: AlternateLocalePaths }) {
  // The prop is a fresh object on every render; its JSON is a stable identity.
  const key = JSON.stringify(paths);

  useEffect(() => {
    publish(JSON.parse(key) as AlternateLocalePaths);
    return () => publish(null);
  }, [key]);

  return null;
}
