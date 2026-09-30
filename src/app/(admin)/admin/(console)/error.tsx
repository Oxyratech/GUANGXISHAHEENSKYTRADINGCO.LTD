"use client";

import { AdminErrorPanel } from "@/components/admin/AdminErrorPanel";

/**
 * Error boundary for every console page. It sits inside the console layout, so the sidebar and top
 * bar stay usable and the person can navigate away. Only the digest is shown, as a reference.
 */
export default function ConsoleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <AdminErrorPanel error={error} retry={retry} />;
}
