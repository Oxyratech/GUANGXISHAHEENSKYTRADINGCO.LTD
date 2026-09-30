import { ExternalLink } from "lucide-react";
import type { Locale } from "@/i18n/locales";

const LOCALE_LABEL: Record<Locale, string> = { en: "EN", zh: "ZH", ar: "AR" };

/**
 * One small "open in a new tab" link per locale, for a registry row's public page. Plain `<a>` tags
 * (not AdminLink/SmartLink): these point at the public `[locale]` tree, a different route group from
 * the admin, so the link behaves like RegistryNotice's "View on the public site" link.
 */
export function PublicPageLinks({ paths }: { paths: Record<Locale, string> }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {(Object.entries(paths) as [Locale, string][]).map(([locale, href]) => (
        <li key={locale}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xs text-blue-700 underline-offset-4 hover:underline"
          >
            {LOCALE_LABEL[locale]}
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
