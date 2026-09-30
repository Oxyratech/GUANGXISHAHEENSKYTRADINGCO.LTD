"use client";

import { AdminErrorPanel } from "@/components/admin/AdminErrorPanel";

/**
 * Error boundary for the admin above the console layout: the login page and a failure in the console
 * layout itself. There is no shell here, so the panel stands alone. Failures inside a console page are
 * caught lower down, by (console)/error.tsx, and keep the shell.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <AdminErrorPanel error={error} retry={retry} standalone />;
}
