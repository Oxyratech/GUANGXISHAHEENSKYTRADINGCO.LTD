"use client";

import { Download } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import type { AnalyticsProps } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";

/**
 * Download link for a public product document. The media route answers with an attachment, so the
 * browser saves the file; the click is counted as `document_viewed` (aggregate, cookieless, and
 * only when the visitor allows analytics).
 */
export function DocumentDownloadLink({
  href,
  label,
  accessibleName,
  analytics,
}: {
  href: string;
  label: string;
  /** Full accessible name; it starts with the visible label, as WCAG 2.5.3 expects. */
  accessibleName: string;
  analytics: AnalyticsProps;
}) {
  return (
    <a
      href={href}
      aria-label={accessibleName}
      className={buttonVariants({ variant: "outline", size: "sm" })}
      onClick={() => trackEvent("document_viewed", analytics)}
    >
      <Download aria-hidden />
      {label}
    </a>
  );
}
