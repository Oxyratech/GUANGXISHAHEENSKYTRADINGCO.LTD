import { Alert } from "@/components/ui/alert";
import { LOCALE_META } from "@/i18n/locales";
import type { StaticContentCoverage } from "@/server/admin/translations/static-content";

/**
 * Categories, services, FAQ and every message namespace: this content lives in code and message
 * files (see @/content and @/messages), not the database, and its key trees are enforced identical
 * across locales by src/i18n/messages.test.ts. This recomputes that same check, so the page states
 * the real result rather than assuming the test still passes.
 */
export function StaticContentCoveragePanel({ coverage }: { coverage: StaticContentCoverage }) {
  const incomplete = coverage.namespaces.filter((namespace) => !namespace.complete);

  return (
    <div className="grid gap-4">
      {coverage.complete ? (
        <Alert variant="success" title="Complete">
          <p>
            Every one of the {coverage.namespaces.length} message namespaces (categories, services,
            FAQ and the rest of the site&apos;s static copy) has the same keys, filled in, in
            English, Chinese and Arabic. This is enforced by an automated test, so it is expected to
            stay true.
          </p>
        </Alert>
      ) : (
        <Alert variant="warning" title="Some static content is missing a translation">
          <div className="grid gap-3">
            <p>
              {incomplete.length} of {coverage.namespaces.length} namespaces have a missing or empty
              key in at least one locale. This should not happen — src/i18n/messages.test.ts is
              meant to catch it — so treat this as a bug to fix in the message files, not something
              to edit here.
            </p>
            <ul className="grid gap-2">
              {incomplete.map((namespace) => (
                <li
                  key={namespace.namespace}
                  className="rounded-md border border-line bg-white p-3 text-small"
                >
                  <p className="font-medium text-navy-900">{namespace.namespace}</p>
                  {(Object.entries(namespace.missingKeys) as [string, string[]][]).map(
                    ([locale, keys]) => (
                      <p key={locale} className="mt-1 text-ink-muted">
                        {LOCALE_META[locale as keyof typeof LOCALE_META]?.nativeName ?? locale}:{" "}
                        {keys.join(", ")}
                      </p>
                    ),
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Alert>
      )}
    </div>
  );
}
