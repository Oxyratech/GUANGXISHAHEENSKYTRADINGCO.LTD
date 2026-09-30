import "server-only";
import { loadMessages } from "@/i18n/load-messages";
import { LOCALES, type Locale } from "@/i18n/locales";
import { NAMESPACES, type Namespace } from "@/i18n/namespaces";

/*
 * Static content — categories, services, FAQ and every i18n message namespace — lives in code and
 * message files, not the database (see docs/ARCHITECTURE.md and src/content). Its key trees are
 * already enforced identical across en/zh/ar by src/i18n/messages.test.ts; this recomputes the same
 * comparison for the report, so the page states the real result rather than assuming that test passed.
 */

export interface NamespaceCoverage {
  namespace: Namespace;
  /** Dotted key paths English has that a locale is missing or has empty, by locale. */
  missingKeys: Partial<Record<Locale, string[]>>;
  complete: boolean;
}

export interface StaticContentCoverage {
  namespaces: NamespaceCoverage[];
  complete: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Dotted-path leaves of a message tree. An empty object/array counts as a (non-string) leaf. */
function flatten(value: unknown, path = "", out = new Map<string, unknown>()): Map<string, unknown> {
  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0 && path !== "") {
      out.set(path, value);
    } else {
      for (const key of keys) flatten(value[key], path ? `${path}.${key}` : key, out);
    }
  } else if (Array.isArray(value)) {
    if (value.length === 0 && path !== "") {
      out.set(path, value);
    } else {
      value.forEach((item, index) => flatten(item, path ? `${path}.${index}` : String(index), out));
    }
  } else {
    out.set(path, value);
  }
  return out;
}

function isMissingOrEmpty(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.trim() === "");
}

const REFERENCE_LOCALE: Locale = "en";

export async function computeStaticContentCoverage(): Promise<StaticContentCoverage> {
  const messagesByLocale = new Map(
    await Promise.all(LOCALES.map(async (locale) => [locale, await loadMessages(locale)] as const)),
  );

  const namespaces: NamespaceCoverage[] = NAMESPACES.map((namespace) => {
    const leavesByLocale = new Map(
      LOCALES.map((locale) => [locale, flatten(messagesByLocale.get(locale)?.[namespace])]),
    );
    const reference = leavesByLocale.get(REFERENCE_LOCALE) ?? new Map();

    const missingKeys: Partial<Record<Locale, string[]>> = {};
    for (const locale of LOCALES) {
      if (locale === REFERENCE_LOCALE) continue;
      const leaves = leavesByLocale.get(locale) ?? new Map();
      const missing = [...reference.keys()].filter((key) => isMissingOrEmpty(leaves.get(key)));
      if (missing.length > 0) missingKeys[locale] = missing;
    }

    return { namespace, missingKeys, complete: Object.keys(missingKeys).length === 0 };
  });

  return { namespaces, complete: namespaces.every((entry) => entry.complete) };
}
