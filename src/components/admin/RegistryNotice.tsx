import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { DEFAULT_LOCALE } from "@/i18n/locales";

/** The public page for a locale-less path ("/business/import-export" -> "/en/business/import-export"). */
function publicHref(path: string): string {
  return path === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${path}`;
}

/**
 * The callout on screens for content that is code, not data (categories, services, FAQs): it says so,
 * names the repository file to edit, and links to the public page it drives. There is nothing to
 * save here, and the notice keeps anyone from looking for an edit button.
 */
export function RegistryNotice({
  filePath,
  publicPath,
  children,
}: {
  /** Repository-relative path of the file that defines the content, e.g. "src/content/services.ts". */
  filePath: string;
  /** Locale-less public path this content appears on, e.g. "/business". Omit when there is none. */
  publicPath?: string;
  /** Overrides the default explanation. */
  children?: ReactNode;
}) {
  return (
    <Alert variant="info" title="Managed in code">
      <p>
        {children ??
          "This content lives in the repository, not the database, so it cannot be edited here. Change the file below and deploy."}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          File: <code className="font-mono text-caption break-all text-ink">{filePath}</code>
        </span>
        {publicPath ? (
          <a
            href={publicHref(publicPath)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xs text-blue-700 underline-offset-4 hover:underline"
          >
            View on the public site
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : null}
      </p>
    </Alert>
  );
}
