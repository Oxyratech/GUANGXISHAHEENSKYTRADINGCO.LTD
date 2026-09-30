"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { AdminButtonLink } from "./AdminLink";
import { AdminStandalone } from "./AdminStandalone";

/**
 * The body of the admin error boundaries. It shows a friendly message and the error's digest as a
 * reference (the digest is what matches the server log). The message and stack are never rendered:
 * they can carry SQL, paths or connection details.
 */
export function AdminErrorPanel({
  error,
  retry,
  standalone = false,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  /** True above the console layout, where there is no shell to sit inside. */
  standalone?: boolean;
}) {
  const state = {
    titleAs: "h1",
    title: "Something went wrong",
    description:
      "An unexpected error stopped this page from loading. Try again; if it keeps happening, give the reference below to whoever runs the server.",
    action: (
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={retry}>Try again</Button>
        <AdminButtonLink href="/admin" variant="outline">
          Back to the dashboard
        </AdminButtonLink>
      </div>
    ),
  } as const;

  const panel = (
    <div className="rounded-lg border border-line bg-white shadow-card">
      {error.digest ? (
        <ErrorState {...state} referenceId={error.digest} referenceLabel="Reference" />
      ) : (
        <ErrorState {...state} />
      )}
    </div>
  );

  return standalone ? <AdminStandalone>{panel}</AdminStandalone> : panel;
}
